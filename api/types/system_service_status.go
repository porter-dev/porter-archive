package types

import (
	"fmt"

	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"
)

// InvolvedObjectType is the k8s object the service runs
// it has to be one of deplouyment, statefulset or daemonset
type InvolvedObjectType string

const (
	//  ServiceDeployment is a service that runs as a deployment
	ServiceDeployment InvolvedObjectType = "deployment"
	//  ServiceStatefulSet is a service that runs as a statefulset
	ServiceStatefulSet InvolvedObjectType = "statefulset"
	// ServiceDaemonSet is a service that runs as a daemonset
	ServiceDaemonSet InvolvedObjectType = "daemonset"
)

// ServiceStatus is the status of a service
// it has to be one of healthy, partial_failure or failure
type ServiceStatus string

const (
	// ServiceStatusHealthy is when a service is fully healthy
	ServiceStatusHealthy ServiceStatus = "healthy"
	// ServiceStatusPartialFailure is when a service is partially failing
	ServiceStatusPartialFailure ServiceStatus = "partial_failure"
	// ServiceStatusFailure is when a service is critically in failure mode
	ServiceStatusFailure ServiceStatus = "failure"
)

// SystemServicesStatus contains the system infrastructure status for a cluster
type SystemServicesStatus struct {
	// NoClusterHeartbeat is set to true if the cluster hasn't heartbeat in 10 minutes
	NoClusterHeartbeat bool
	// Statuses is a list of SystemServiceStatus
	// there should be only one entry for a service
	Statuses []SystemServiceStatus
}

// SystemServiceStatus contains the status of a system service
type SystemServiceStatus struct {
	SystemService SystemService
	SystemStatus  ServiceStatus
}

// SystemService identifies a system service
type SystemService struct {
	Name               string
	Namespace          string
	InvolvedObjectType InvolvedObjectType
}

// ToSystemServicesStatus converts the CCP resposne to the internal SystemServicesStatus
func ToSystemServicesStatus(apiResp *porterv1.ListSystemServiceStatusResponse) (SystemServicesStatus, error) {
	if apiResp == nil {
		return SystemServicesStatus{}, fmt.Errorf("nil system service status response")
	}
	resp := SystemServicesStatus{
		NoClusterHeartbeat: apiResp.NoClusterHearbeat,
		Statuses:           []SystemServiceStatus{},
	}
	for _, apiStatus := range apiResp.SystemServiceStatus {
		status, err := toSystemServiceStatus(*apiStatus)
		if err != nil {
			return SystemServicesStatus{}, err
		}
		resp.Statuses = append(resp.Statuses, status)
	}
	return resp, nil
}

func toSystemServiceStatus(apiStatus porterv1.SystemServiceStatus) (SystemServiceStatus, error) {
	systemService, err := toSystemService(*apiStatus.SystemService)
	if err != nil {
		return SystemServiceStatus{}, err
	}
	status, err := toServiceStatus(apiStatus.ServiceStatus)
	if err != nil {
		return SystemServiceStatus{}, err
	}
	return SystemServiceStatus{
		SystemService: systemService,
		SystemStatus:  status,
	}, nil
}

func toSystemService(apiSystemService porterv1.SystemService) (SystemService, error) {
	involvedObjectType, err := toInternalInvolvedObjectType(apiSystemService.InvolvedObjectType)
	if err != nil {
		return SystemService{}, err
	}
	return SystemService{
		Name:               apiSystemService.Name,
		Namespace:          apiSystemService.Namespace,
		InvolvedObjectType: involvedObjectType,
	}, nil
}

func toInternalInvolvedObjectType(apiType porterv1.InvolvedObjectType) (InvolvedObjectType, error) {
	switch apiType {
	case porterv1.InvolvedObjectType_INVOLVED_OBJECT_TYPE_DEPLOYMENT:
		return ServiceDeployment, nil
	case porterv1.InvolvedObjectType_INVOLVED_OBJECT_TYPE_STATEFULSET:
		return ServiceStatefulSet, nil
	case porterv1.InvolvedObjectType_INVOLVED_OBJECT_TYPE_DAEMONSET:
		return ServiceDaemonSet, nil
	default:
		return "", fmt.Errorf("unknown involved object type")
	}
}

func toServiceStatus(apiStatus porterv1.ServiceStatus) (ServiceStatus, error) {
	switch apiStatus {
	case porterv1.ServiceStatus_SERVICE_STATUS_HEALTHY:
		return ServiceStatusHealthy, nil
	case porterv1.ServiceStatus_SERVICE_STATUS_PARTIAL_FAILURE:
		return ServiceStatusPartialFailure, nil
	case porterv1.ServiceStatus_SERVICE_STATUS_FAILURE:
		return ServiceStatusFailure, nil
	default:
		return "", fmt.Errorf("unknown service status")
	}
}
