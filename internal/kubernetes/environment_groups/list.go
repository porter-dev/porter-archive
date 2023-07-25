package environment_groups

import (
	"context"
	"fmt"
	"strings"

	"github.com/porter-dev/porter/internal/kubernetes"
	"github.com/porter-dev/porter/internal/telemetry"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

const (
	LabelKey_LinkedEnvironmentGroup  = "porter.run/linked-environment-group"
	LabelKey_EnvironmentGroupVersion = "porter.run/environment-group-version"
	LabelKey_EnvironmentGroupName    = "porter.run/environment-group-name"

	// Namespace_EnvironmentGroups is the base namespace for storing all environment groups.
	// The configmaps and secrets here should be considered the source's of truth for a given version
	Namespace_EnvironmentGroups = "porter-env-group"
)

// EnvironmentGroup represents a ConfigMap in the porter-env-group namespace
type EnvironmentGroup struct {
	// Name is the environment group name which can be found in the labels (LabelKey_EnvironmentGroupName) of the ConfigMap. This is NOT the configmap name
	Name string `json:"name"`
	// Version is the environment group version which can be found in the labels (LabelKey_EnvironmentGroupVersion) of the ConfigMap. This is NOT included in the configmap name
	Version string `json:"latest_version"`
	// Variables are non-secret values for the EnvironmentGroup. This usually will be a configmap
	Variables map[string]string `json:"variables"`
	// CreatedAt is only used for display purposes and is in UTC Unix time
	CreatedAt int64 `json:"created_at"`
}

// ListBaseEnvironmentGroups returns all environment groups stored in the porter-env-group namespace
func ListBaseEnvironmentGroups(ctx context.Context, a *kubernetes.Agent) ([]EnvironmentGroup, error) {
	ctx, span := telemetry.NewSpan(ctx, "list-all-env-groups")
	defer span.End()

	listResp, err := a.Clientset.CoreV1().ConfigMaps(Namespace_EnvironmentGroups).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, telemetry.Error(ctx, span, err, "unable to list environment groups")
	}

	var envGroups []EnvironmentGroup
	for _, cm := range listResp.Items {
		name, ok := cm.Labels[LabelKey_EnvironmentGroupName]
		if !ok {
			continue // missing name label, not an environment group
		}
		version, ok := cm.Labels[LabelKey_EnvironmentGroupVersion]
		if !ok {
			continue // missing version label, not an environment group
		}
		eg := EnvironmentGroup{
			Name:      name,
			Version:   version,
			Variables: cm.Data,
			CreatedAt: cm.CreationTimestamp.Unix(),
		}

		envGroups = append(envGroups, eg)
	}

	return envGroups, nil
}

// LinkedPorterApplication represents an application which was linked to an environment group
type LinkedPorterApplication struct {
	Name      string
	Namespace string
}

// LinkedApplications lists all applications that are linked to a given environment group. Since there can be multiple linked environment groups we must check by the presence of a label on the deployment and job
func LinkedApplications(ctx context.Context, a *kubernetes.Agent, environmentGroupName string) ([]LinkedPorterApplication, error) {
	ctx, span := telemetry.NewSpan(ctx, "list-linked-applications")
	defer span.End()

	if environmentGroupName == "" {
		return nil, telemetry.Error(ctx, span, nil, "environment group cannot be empty")
	}
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "environment-group-name", Value: environmentGroupName})

	deployListResp, err := a.Clientset.AppsV1().Deployments(metav1.NamespaceAll).List(ctx,
		metav1.ListOptions{
			// LabelSelector: fmt.Sprintf("%s=%s", LabelKey_LinkedEnvironmentGroup, environmentGroupName),
			LabelSelector: LabelKey_LinkedEnvironmentGroup,
		})
	if err != nil {
		return nil, telemetry.Error(ctx, span, err, "unable to list linked deployment applications")
	}

	var apps []LinkedPorterApplication
	for _, d := range deployListResp.Items {
		applicationsLinkedEnvironmentGroups := strings.Split(d.Labels[LabelKey_LinkedEnvironmentGroup], ",")

		for _, linkedEnvironmentGroup := range applicationsLinkedEnvironmentGroups {
			if linkedEnvironmentGroup == environmentGroupName {
				apps = append(apps, LinkedPorterApplication{
					Name:      d.Name,
					Namespace: d.Namespace,
				})
			}
		}
	}

	cronListResp, err := a.Clientset.BatchV1().CronJobs(metav1.NamespaceAll).List(ctx,
		metav1.ListOptions{
			LabelSelector: fmt.Sprintf("%s=%s", LabelKey_LinkedEnvironmentGroup, environmentGroupName),
		})
	if err != nil {
		return nil, telemetry.Error(ctx, span, err, "unable to list linked cronjob applications")
	}
	for _, d := range cronListResp.Items {
		apps = append(apps, LinkedPorterApplication{
			Name:      d.Name,
			Namespace: d.Namespace,
		})
	}

	return apps, nil
}
