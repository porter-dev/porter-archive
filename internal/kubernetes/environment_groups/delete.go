package environment_groups

import (
	"context"
	"fmt"

	"github.com/porter-dev/porter/internal/kubernetes"
	"github.com/porter-dev/porter/internal/telemetry"
	k8serror "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// DeleteEnvironmentGroup deletes an environment group and all of its versions from all namespaces, only if there are no linked applications
func DeleteEnvironmentGroup(ctx context.Context, a *kubernetes.Agent, name string) error {
	ctx, span := telemetry.NewSpan(ctx, "delete-environment-groups")
	defer span.End()

	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "environment-group", Value: name})

	if name == "" {
		return telemetry.Error(ctx, span, nil, "environment group name cannot be empty")
	}

	environmentGroups, err := ListEnvironmentGroups(ctx, a, WithEnvironmentGroupName(name), WithNamespace(Namespace_EnvironmentGroups))
	if err != nil {
		return telemetry.Error(ctx, span, err, "unable to list environment groups")
	}

	for _, environmentGroup := range environmentGroups {
		applications, err := LinkedApplications(ctx, a, environmentGroup.Name)
		if err != nil {
			return telemetry.Error(ctx, span, err, "unable to list linked applications")
		}
		if len(applications) > 0 {
			telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "linked-applications", Value: len(applications)})
			return telemetry.Error(ctx, span, nil, "unable to delete environment group with linked applications")
		}
	}

	allConfigMapsInAllNamespaces, err := a.Clientset.CoreV1().ConfigMaps(metav1.NamespaceAll).List(ctx,
		metav1.ListOptions{LabelSelector: fmt.Sprintf("%s=%s", LabelKey_EnvironmentGroupName, name)},
	)
	if err != nil {
		return telemetry.Error(ctx, span, err, "unable to list environment group variables")
	}

	for _, val := range allConfigMapsInAllNamespaces.Items {
		labelName := fmt.Sprintf("%s.%s", val.Labels[LabelKey_EnvironmentGroupName], val.Labels[LabelKey_EnvironmentGroupVersion])

		err := a.Clientset.CoreV1().ConfigMaps(val.Namespace).Delete(ctx,
			labelName,
			metav1.DeleteOptions{},
		)
		if err != nil {
			if !k8serror.IsNotFound(err) {
				return telemetry.Error(ctx, span, err, "unable to delete environment group variables")
			}
		}

		err = a.Clientset.CoreV1().Secrets(val.Namespace).Delete(ctx,
			labelName,
			metav1.DeleteOptions{},
		)
		if err != nil {
			if !k8serror.IsNotFound(err) {
				return telemetry.Error(ctx, span, err, "unable to delete environment group secret variables")
			}
		}
	}

	return nil
}
