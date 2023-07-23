package environment_groups

import (
	"context"
	"fmt"
	"strconv"

	"github.com/porter-dev/porter/internal/kubernetes"
	"github.com/porter-dev/porter/internal/telemetry"
	k8sErrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// LatestBaseEnvironmentGroup returns the most recent version of an environment group stored in the porter-env-group namespace
func LatestBaseEnvironmentGroup(ctx context.Context, a *kubernetes.Agent, environmentGroupName string) (EnvironmentGroup, error) {
	ctx, span := telemetry.NewSpan(ctx, "latest-base-env-group")
	defer span.End()
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "environment-group-name", Value: environmentGroupName})

	var eg EnvironmentGroup

	listResp, err := a.Clientset.CoreV1().ConfigMaps(Namespace_EnvironmentGroups).List(ctx,
		metav1.ListOptions{
			LabelSelector: fmt.Sprintf("%s=%s", LabelKey_EnvironmentGroupName, environmentGroupName),
		})
	if err != nil {
		if !k8sErrors.IsNotFound(err) {
			return eg, telemetry.Error(ctx, span, err, "unable to list environment groups by name")
		}
	}

	highestVersion := 0
	var highestVersionConfigMap EnvironmentGroup
	for _, cm := range listResp.Items {
		versionLabelStr, ok := cm.Labels[LabelKey_EnvironmentGroupVersion]
		if !ok {
			continue
		}

		versionInt, err := strconv.Atoi(versionLabelStr)
		if err != nil {
			telemetry.WithAttributes(span,
				telemetry.AttributeKV{Key: "environment-group-version", Value: versionLabelStr},
			)
			return eg, telemetry.Error(ctx, span, err, "unable to convert version label to int")
		}

		if versionInt > highestVersion {
			highestVersion = versionInt
			highestVersionConfigMap = EnvironmentGroup{
				Name:      environmentGroupName,
				Version:   versionLabelStr,
				Variables: cm.Data,
				CreatedAt: cm.CreationTimestamp.Unix(),
			}
		}
	}

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "highest-version", Value: highestVersion},
		telemetry.AttributeKV{Key: "highest-version-name", Value: highestVersionConfigMap.Name},
	)

	if highestVersionConfigMap.Name == "" {
		return eg, telemetry.Error(ctx, span, nil, "unable to find the latest base environment group by the provided name")
	}

	return highestVersionConfigMap, nil
}

// EnvironmentGroupInTargetNamespaceInput contains all information required to check if an environment group exists in a target namespace.
// If you are looking for envrionment groups in the base namespace, consider using LatestBaseEnvironmentGroup or ListBaseEnvironmentGroups instead
type EnvironmentGroupInTargetNamespaceInput struct {
	// Name is the environment group name which can be found on the configmap label
	Name      string
	Version   string
	Namespace string
}

// EnvironmentGroupInTargetNamespace checks if an environment group of a specific name and version exists in a target namespace.
// If an environment group exists, it will be returned
func EnvironmentGroupInTargetNamespace(ctx context.Context, a *kubernetes.Agent, inp EnvironmentGroupInTargetNamespaceInput) (EnvironmentGroup, error) {
	ctx, span := telemetry.NewSpan(ctx, "env-group-in-target-namespace")
	defer span.End()

	var eg EnvironmentGroup

	if inp.Name == "" {
		return eg, telemetry.Error(ctx, span, nil, "must provide an environment group name")
	}
	if inp.Version == "" {
		return eg, telemetry.Error(ctx, span, nil, "must provide an environment group version to check for")
	}
	if inp.Namespace == "" {
		return eg, telemetry.Error(ctx, span, nil, "must provide a namespace to check")
	}
	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "environment-group-name", Value: inp.Name},
		telemetry.AttributeKV{Key: "environment-group-version", Value: inp.Version},
		telemetry.AttributeKV{Key: "namespace", Value: inp.Namespace},
	)

	listResp, err := a.Clientset.CoreV1().ConfigMaps(inp.Namespace).List(ctx,
		metav1.ListOptions{
			LabelSelector: fmt.Sprintf("%s=%s,%s=%s", LabelKey_EnvironmentGroupName, inp.Name, LabelKey_EnvironmentGroupVersion, inp.Version),
		})
	if err != nil {
		if k8sErrors.IsNotFound(err) {
			return eg, nil
		}
		return eg, telemetry.Error(ctx, span, err, "unable to list environment groups by name and version in namespace")
	}

	if len(listResp.Items) > 1 {
		telemetry.WithAttributes(span,
			telemetry.AttributeKV{Key: "expected-results", Value: 1},
			telemetry.AttributeKV{Key: "actual-results", Value: len(listResp.Items)},
		)
		return eg, telemetry.Error(ctx, span, nil, "unexpected number of versions found in namespace")
	}

	if len(listResp.Items) == 1 {
		li := listResp.Items[0]
		name, ok := li.Labels[LabelKey_EnvironmentGroupName]
		if !ok {
			return eg, telemetry.Error(ctx, span, nil, "environment group configmap missing name label")
		}
		version, ok := li.Labels[LabelKey_EnvironmentGroupVersion]
		if !ok {
			return eg, telemetry.Error(ctx, span, nil, "environment group configmap missing version label")
		}
		return EnvironmentGroup{Name: name, Version: version, Variables: li.Data}, nil
	}

	return eg, nil
}
