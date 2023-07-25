package environment_groups

import (
	"context"
	"fmt"
	"strconv"

	"github.com/porter-dev/porter/internal/kubernetes"
	"github.com/porter-dev/porter/internal/telemetry"
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

	latestEnvironmentGroup, err := LatestBaseEnvironmentGroup(ctx, a, environmentGroup.Name)
	if err != nil {
		return telemetry.Error(ctx, span, err, "unable to get latest base environment group by name")
	}

	newEnvironmentGroup := EnvironmentGroup{
		Name:            environmentGroup.Name,
		Variables:       environmentGroup.Variables,
		SecretVariables: environmentGroup.SecretVariables,
		Version:         latestEnvironmentGroup.Version + 1,
		CreatedAtUTC:    environmentGroup.CreatedAtUTC,
	}

	err = createVersionedEnvironmentGroupInNamespace(ctx, a, newEnvironmentGroup, Namespace_EnvironmentGroups)
	if err != nil {
		return telemetry.Error(ctx, span, err, "unable to create new versioned environment group")
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
	if environmentGroup.Version == 0 {
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

	err = createVersionedEnvironmentGroupInNamespace(ctx, a, environmentGroup, namespace)
	if err != nil {
		return configMapName, telemetry.Error(ctx, span, err, "error creating environment group clone in target namespace")
	}

	return configMapName, nil
}

// createVersionedEnvironmentGroupInNamespace creates a new environment group in the target namespace. This is used to keep the configmap and secret version for an environment variable in sync
func createVersionedEnvironmentGroupInNamespace(ctx context.Context, a *kubernetes.Agent, environmentGroup EnvironmentGroup, targetNamespace string) error {
	ctx, span := telemetry.NewSpan(ctx, "create-environment-group-on-cluster")
	defer span.End()

	fmt.Println("STEFAN", environmentGroup.Variables, environmentGroup.SecretVariables)

	configMap := v1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{
			Name:      fmt.Sprintf("%s.%d", environmentGroup.Name, environmentGroup.Version),
			Namespace: targetNamespace,
			Labels: map[string]string{
				LabelKey_EnvironmentGroupName:    environmentGroup.Name,
				LabelKey_EnvironmentGroupVersion: strconv.Itoa(environmentGroup.Version),
			},
		},
		Data: environmentGroup.Variables,
	}
	err := createConfigMapWithVersion(ctx, a, configMap, environmentGroup.Version)
	if err != nil {
		return telemetry.Error(ctx, span, err, "unable to create new environment group variables version")
	}

	secret := v1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      fmt.Sprintf("%s.%d", environmentGroup.Name, environmentGroup.Version),
			Namespace: targetNamespace,
			Labels: map[string]string{
				LabelKey_EnvironmentGroupName:    environmentGroup.Name,
				LabelKey_EnvironmentGroupVersion: strconv.Itoa(environmentGroup.Version),
			},
		},
		Data: environmentGroup.SecretVariables,
	}

	err = createSecretWithVersion(ctx, a, secret, environmentGroup.Version)
	if err != nil {
		return telemetry.Error(ctx, span, err, "unable to create new environment group secret variables version")
	}

	return nil
}

func createConfigMapWithVersion(ctx context.Context, a *kubernetes.Agent, configMap v1.ConfigMap, version int) error {
	ctx, span := telemetry.NewSpan(ctx, "create-environment-group-configmap")
	defer span.End()

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "configmap-label", Value: configMap.Labels[LabelKey_EnvironmentGroupName]},
		telemetry.AttributeKV{Key: "configmap-version", Value: configMap.Labels[LabelKey_EnvironmentGroupVersion]},
		telemetry.AttributeKV{Key: "configmap-name", Value: configMap.Name},
		telemetry.AttributeKV{Key: "configmap-namespace", Value: configMap.Namespace},
	)

	_, err := a.Clientset.CoreV1().ConfigMaps(configMap.Namespace).Create(ctx, &configMap, metav1.CreateOptions{})
	if err != nil {
		return telemetry.Error(ctx, span, err, "unable to create environment group configmap")
	}

	return nil
}

func createSecretWithVersion(ctx context.Context, a *kubernetes.Agent, secret v1.Secret, version int) error {
	ctx, span := telemetry.NewSpan(ctx, "create-environment-group-secret")
	defer span.End()

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "secret-label", Value: secret.Labels[LabelKey_EnvironmentGroupName]},
		telemetry.AttributeKV{Key: "secret-version", Value: secret.Labels[LabelKey_EnvironmentGroupVersion]},
		telemetry.AttributeKV{Key: "secret-name", Value: secret.Name},
		telemetry.AttributeKV{Key: "secret-namespace", Value: secret.Namespace},
	)

	_, err := a.Clientset.CoreV1().Secrets(secret.Namespace).Create(ctx, &secret, metav1.CreateOptions{})
	if err != nil {
		return telemetry.Error(ctx, span, err, "unable to create environment group secret")
	}

	return nil
}
