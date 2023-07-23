package environment_groups

import (
	"context"
	"fmt"
	"strconv"

	"github.com/porter-dev/porter/internal/kubernetes"
	"github.com/porter-dev/porter/internal/telemetry"
	"go.opentelemetry.io/otel/trace"
	v1 "k8s.io/api/core/v1"
	k8serror "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// CreateOrUpdateBaseEnvironmentGroup creates a new environment group in the porter-env-group namespace. If porter-env-group does not exist, it will be created.
// If no existing environmentGroup exists by this name, a new one will be created as version 1, denoted by the label "porter.run/environment-group-version: 1".
// If an environmentGroup already exists by this name, a new version will be created, and the label will be updated to reflect the new version.
// Providing the Version field to this function will be ignored in order to not accidentally overwrite versions
func CreateOrUpdateBaseEnvironmentGroup(ctx context.Context, a *kubernetes.Agent, environmentGroup EnvironmentGroup) error {
	ctx, span := telemetry.NewSpan(ctx, "create-environment-group")
	defer span.End()
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "environment-group", Value: environmentGroup.Name})

	if environmentGroup.Name == "" {
		return telemetry.Error(ctx, span, nil, "environment group name cannot be empty")
	}

	_, err := a.Clientset.CoreV1().Namespaces().Get(ctx, Namespace_EnvironmentGroups, metav1.GetOptions{})
	if err != nil {
		if !k8serror.IsNotFound(err) {
			return telemetry.Error(ctx, span, err, "unable to check if global environment group exists")
		}

		_, err = a.Clientset.CoreV1().Namespaces().Create(ctx, &v1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: Namespace_EnvironmentGroups}}, metav1.CreateOptions{})
		if err != nil {
			return telemetry.Error(ctx, span, err, "unable to create global environment group")
		}
	}
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "environment-group-namespace", Value: Namespace_EnvironmentGroups})

	configMap := &v1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{
			Namespace: Namespace_EnvironmentGroups,
			Labels: map[string]string{
				LabelKey_EnvironmentGroupName: environmentGroup.Name,
			},
		},
		Data: environmentGroup.Variables,
	}

	allEnvGroups, err := a.Clientset.CoreV1().ConfigMaps(Namespace_EnvironmentGroups).List(ctx,
		metav1.ListOptions{LabelSelector: fmt.Sprintf("%s=%s", LabelKey_EnvironmentGroupName, environmentGroup.Name)},
	)
	if err != nil {
		if !k8serror.IsNotFound(err) {
			return telemetry.Error(ctx, span, err, "unable to check if environment group exists")
		}

		err = createConfigMapWithVersion(ctx, span, a, *configMap, 1)
		if err != nil {
			return telemetry.Error(ctx, span, err, "error creating environment group version which has no existing environment group of the same name label")
		}
	}

	var highestVersionFromLabel int

	for _, existingEnvGroup := range allEnvGroups.Items {
		versionValue, ok := existingEnvGroup.Labels[LabelKey_EnvironmentGroupVersion]
		if !ok {
			continue
		}
		version, err := strconv.Atoi(versionValue)
		if err != nil {
			return telemetry.Error(ctx, span, err, "unable to parse environment group version which exists")
		}
		if version > highestVersionFromLabel {
			highestVersionFromLabel = version
		}
	}

	newVersion := highestVersionFromLabel + 1
	err = createConfigMapWithVersion(ctx, span, a, *configMap, newVersion)
	if err != nil {
		return telemetry.Error(ctx, span, err, "unable to create new environment group version")
	}

	return nil
}

func createConfigMapWithVersion(ctx context.Context, span trace.Span, a *kubernetes.Agent, configMap v1.ConfigMap, version int) error {
	versionString := strconv.Itoa(version)
	if configMap.Labels == nil {
		configMap.Labels = make(map[string]string)
	}
	configMap.Labels[LabelKey_EnvironmentGroupVersion] = versionString

	name, ok := configMap.Labels[LabelKey_EnvironmentGroupName]
	if !ok {
		return telemetry.Error(ctx, span, nil, "environment group name label not found")
	}
	configMap.Name = fmt.Sprintf("%s.%s", name, versionString)

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "create-cm-version", Value: versionString},
		telemetry.AttributeKV{Key: "create-cm-label", Value: configMap.Labels[LabelKey_EnvironmentGroupName]},
		telemetry.AttributeKV{Key: "create-cm-name", Value: configMap.Name},
		telemetry.AttributeKV{Key: "create-cm-namespace", Value: configMap.Namespace},
	)

	_, err := a.Clientset.CoreV1().ConfigMaps(configMap.Namespace).Create(ctx, &configMap, metav1.CreateOptions{})
	if err != nil {
		return telemetry.Error(ctx, span, err, "unable to create environment group for non-secret variables")
	}

	return nil
}

// createEnvironmentGroupInTargetNamespace creates a new environment group in the target namespace. If you want to create a new base environment group, use CreateOrUpdateBaseEnvironmentGroup instead.
// This should only be used for sync from a base environment to a target environment.
// If the target namespace does not exist, it will be created for you.
func createEnvironmentGroupInTargetNamespace(ctx context.Context, a *kubernetes.Agent, namespace string, environmentGroup EnvironmentGroup) (string, error) {
	ctx, span := telemetry.NewSpan(ctx, "create-environment-group-in-target")
	defer span.End()
	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "environment-group", Value: environmentGroup.Name},
		telemetry.AttributeKV{Key: "target-namespace", Value: namespace},
	)

	var configMapName string

	if environmentGroup.Name == "" {
		return configMapName, telemetry.Error(ctx, span, nil, "environment group name cannot be empty")
	}
	if environmentGroup.Version == "" {
		return configMapName, telemetry.Error(ctx, span, nil, "environment group version cannot be empty")
	}
	if namespace == "" {
		return configMapName, telemetry.Error(ctx, span, nil, "target namespace cannot be empty")
	}

	_, err := a.Clientset.CoreV1().Namespaces().Get(ctx, namespace, metav1.GetOptions{})
	if err != nil {
		if !k8serror.IsNotFound(err) {
			return configMapName, telemetry.Error(ctx, span, err, "unable to check if target namespace exists")
		}

		_, err = a.Clientset.CoreV1().Namespaces().Create(ctx, &v1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: namespace}}, metav1.CreateOptions{})
		if err != nil {
			return configMapName, telemetry.Error(ctx, span, err, "unable to create new target namespace")
		}
	}
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "environment-group-namespace", Value: namespace})

	configMapName = fmt.Sprintf("%s.%s", environmentGroup.Name, environmentGroup.Version)
	configMap := v1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{
			Name:      configMapName,
			Namespace: namespace,
			Labels: map[string]string{
				LabelKey_EnvironmentGroupName:    environmentGroup.Name,
				LabelKey_EnvironmentGroupVersion: environmentGroup.Version,
			},
		},
		Data: environmentGroup.Variables,
	}

	versionInt, err := strconv.Atoi(environmentGroup.Version)
	if err != nil {
		return configMapName, telemetry.Error(ctx, span, err, "unable to parse environment group version")
	}
	err = createConfigMapWithVersion(ctx, span, a, configMap, versionInt)
	if err != nil {
		return configMapName, telemetry.Error(ctx, span, err, "error creating environment group clone in target namespace")
	}

	return configMapName, nil
}
