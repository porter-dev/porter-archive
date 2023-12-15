package porter_app

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/porter-dev/porter/internal/deployment_target"
	"github.com/porter-dev/porter/internal/kubernetes"
	"github.com/porter-dev/porter/internal/telemetry"
	v1 "k8s.io/api/core/v1"
)

const (
	LabelKey_DeploymentTargetID = "porter.run/deployment-target-id"
	LabelKey_AppName            = "porter.run/app-name"
	LabelKey_ServiceName        = "porter.run/service-name"
	LabelKey_AppRevisionID      = "porter.run/app-revision-id"
)

// ServiceStatus describes the status of a service of a porter app
type ServiceStatus struct {
	ServiceName        string           `json:"service_name"`
	RevisionStatusList []RevisionStatus `json:"revision_status_list"`
}

// RevisionStatus describes the status of a revision of a service of a porter app
type RevisionStatus struct {
	RevisionID         string           `json:"revision_id"`
	RevisionNumber     int              `json:"revision_number"`
	InstanceStatusList []InstanceStatus `json:"instance_status_list"`
}

// InstanceStatusDescriptor is a string that summarizes the status of an instance
type InstanceStatusDescriptor string

const (
	// InstanceStatusDescriptor_Pending means the instance is pending
	InstanceStatusDescriptor_Pending InstanceStatusDescriptor = "PENDING"
	// InstanceStatusDescriptor_Running means the instance is running normally
	InstanceStatusDescriptor_Running InstanceStatusDescriptor = "RUNNING"
	// InstanceStatusDescriptor_Failed means the instance has failed
	InstanceStatusDescriptor_Failed InstanceStatusDescriptor = "FAILED"
)

// CrashLoopBackOff is a string that describes the status of a pod that is in a crash loop backoff
const CrashLoopBackOff = "CrashLoopBackOff"

// InstanceStatus describes the status of an instance of a revision of a service of a porter app
type InstanceStatus struct {
	Status            InstanceStatusDescriptor `json:"status"`
	RestartCount      int                      `json:"restart_count"`
	CreationTimestamp time.Time                `json:"creation_timestamp"`
}

// GetServiceStatusInput is the input type for GetServiceStatus
type GetServiceStatusInput struct {
	DeploymentTarget deployment_target.DeploymentTarget
	Agent            kubernetes.Agent
	AppName          string
	ServiceName      string
	AppRevisions     []Revision
}

// GetServiceStatus returns the status of a service of a porter app
func GetServiceStatus(ctx context.Context, inp GetServiceStatusInput) (ServiceStatus, error) {
	ctx, span := telemetry.NewSpan(ctx, "get-service-status")
	defer span.End()

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "app-name", Value: inp.AppName},
		telemetry.AttributeKV{Key: "service-name", Value: inp.ServiceName},
		telemetry.AttributeKV{Key: "deployment-target-id", Value: inp.DeploymentTarget.ID},
		telemetry.AttributeKV{Key: "deployment-target-namespace", Value: inp.DeploymentTarget.Namespace},
	)

	serviceStatus := ServiceStatus{
		ServiceName: inp.ServiceName,
	}

	if inp.AppName == "" {
		return serviceStatus, telemetry.Error(ctx, span, nil, "must provide app name")
	}
	if inp.ServiceName == "" {
		return serviceStatus, telemetry.Error(ctx, span, nil, "must provide service name")
	}
	if inp.DeploymentTarget.ID == "" {
		return serviceStatus, telemetry.Error(ctx, span, nil, "must provide deployment target id")
	}
	if inp.DeploymentTarget.Namespace == "" {
		return serviceStatus, telemetry.Error(ctx, span, nil, "must provide deployment target namespace")
	}

	selectorString := fmt.Sprintf(
		"%s=%s,%s=%s,%s=%s",
		LabelKey_DeploymentTargetID, inp.DeploymentTarget.ID,
		LabelKey_AppName, inp.AppName,
		LabelKey_ServiceName, inp.ServiceName,
	)

	podList, err := inp.Agent.GetPodsByLabel(selectorString, inp.DeploymentTarget.Namespace)
	if err != nil {
		return serviceStatus, telemetry.Error(ctx, span, err, "error getting pods by label")
	}
	if podList == nil {
		return serviceStatus, telemetry.Error(ctx, span, nil, "pod list is nil")
	}

	revisionStatusList, err := revisionStatusFromPods(ctx, revisionStatusFromPodsInput{
		PodList:      *podList,
		AppRevisions: inp.AppRevisions,
		AppName:      inp.AppName,
		ServiceName:  inp.ServiceName,
	})
	if err != nil {
		return serviceStatus, telemetry.Error(ctx, span, err, "error processing pods")
	}

	serviceStatus.RevisionStatusList = revisionStatusList
	return serviceStatus, nil
}

type revisionStatusFromPodsInput struct {
	PodList      v1.PodList
	AppRevisions []Revision
	AppName      string
	ServiceName  string
}

func revisionStatusFromPods(ctx context.Context, inp revisionStatusFromPodsInput) ([]RevisionStatus, error) {
	ctx, span := telemetry.NewSpan(ctx, "revision-status-from-pods")
	defer span.End()

	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "num-pods", Value: len(inp.PodList.Items)})

	revisionStatusList := []RevisionStatus{}

	revisionToInstanceStatusMap := map[string][]InstanceStatus{}
	for _, pod := range inp.PodList.Items {
		revisionID := pod.Labels[LabelKey_AppRevisionID]
		if revisionID == "" {
			telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "pod-name", Value: pod.Name})
			return revisionStatusList, telemetry.Error(ctx, span, nil, "pod does not have revision id label")
		}

		instanceStatusList, ok := revisionToInstanceStatusMap[revisionID]
		if !ok {
			instanceStatusList = []InstanceStatus{}
		}

		instanceStatus, err := instanceStatusFromPod(ctx, instanceStatusFromPodInput{
			Pod:         pod,
			AppName:     inp.AppName,
			ServiceName: inp.ServiceName,
		})
		if err != nil {
			continue
		}

		instanceStatusList = append(instanceStatusList, instanceStatus)
		revisionToInstanceStatusMap[revisionID] = instanceStatusList
	}

	for revisionId, instanceStatusList := range revisionToInstanceStatusMap {
		revisionNumber, err := getRevisionNumberFromRevisionId(revisionId, inp.AppRevisions)
		if err != nil {
			telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "revision-id", Value: revisionId})
			return revisionStatusList, telemetry.Error(ctx, span, err, "error getting revision number from revision id")
		}
		revisionStatus := RevisionStatus{
			RevisionID:         revisionId,
			RevisionNumber:     revisionNumber,
			InstanceStatusList: instanceStatusList,
		}
		revisionStatusList = append(revisionStatusList, revisionStatus)
	}

	return revisionStatusList, nil
}

type instanceStatusFromPodInput struct {
	Pod         v1.Pod
	AppName     string
	ServiceName string
}

func instanceStatusFromPod(ctx context.Context, inp instanceStatusFromPodInput) (InstanceStatus, error) {
	ctx, span := telemetry.NewSpan(ctx, "instance-status-from-pod")
	defer span.End()

	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "pod-name", Value: inp.Pod.Name})

	instanceStatus := InstanceStatus{}

	// find the container running the app code. Note that this is conditioned on the fact that
	// in our worker/web/job charts, there is one container created with this name during the deployment
	// there may be other containers (like the sidecar container for jobs), but we only care about the app container for reporting status
	appContainerName := fmt.Sprintf("%s-%s", inp.AppName, inp.ServiceName)
	var appContainerStatus v1.ContainerStatus
	for _, containerStatus := range inp.Pod.Status.ContainerStatuses {
		if containerStatus.Name == appContainerName {
			appContainerStatus = containerStatus
			break
		}
	}
	if appContainerStatus.Name == "" {
		return instanceStatus, telemetry.Error(ctx, span, nil, "app container not found")
	}

	instanceStatus.CreationTimestamp = inp.Pod.CreationTimestamp.Time
	instanceStatus.RestartCount = int(appContainerStatus.RestartCount)

	switch inp.Pod.Status.Phase {
	case v1.PodPending:
		instanceStatus.Status = InstanceStatusDescriptor_Pending
	case v1.PodRunning:
		instanceStatus.Status = InstanceStatusDescriptor_Running
	case v1.PodFailed:
		instanceStatus.Status = InstanceStatusDescriptor_Failed
	}

	if appContainerStatus.State.Waiting != nil && appContainerStatus.State.Waiting.Reason == CrashLoopBackOff {
		instanceStatus.Status = InstanceStatusDescriptor_Failed
	}
	if appContainerStatus.State.Terminated != nil {
		instanceStatus.Status = InstanceStatusDescriptor_Failed
	}

	return instanceStatus, nil
}

func getRevisionNumberFromRevisionId(revisionId string, appRevisions []Revision) (int, error) {
	for _, revision := range appRevisions {
		if revision.ID == revisionId {
			return int(revision.RevisionNumber), nil
		}
	}
	return 0, errors.New("revision id not found in app revisions")
}
