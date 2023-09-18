package environment_groups

import (
	"context"
	"fmt"
	"strconv"
	"strings"
	"time"

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
	Version int `json:"latest_version"`
	// Variables are non-secret values for the EnvironmentGroup. This usually will be a configmap
	Variables map[string]string `json:"variables"`
	// SecretVariables are secret values for the EnvironmentGroup. This usually will be a Secret on the kubernetes cluster
	SecretVariables map[string][]byte `json:"variables_secrets,omitempty"`
	// CreatedAt is only used for display purposes and is in UTC Unix time
	CreatedAtUTC time.Time `json:"created_at"`
}

type environmentGroupOptions struct {
	namespace                    string
	environmentGroupLabelName    string
	environmentGroupLabelVersion int
}

// EnvironmentGroupOption is a function that modifies ListEnvironmentGroups
type EnvironmentGroupOption func(*environmentGroupOptions)

// WithNamespace filters all environment groups in a given namespace
func WithNamespace(namespace string) EnvironmentGroupOption {
	return func(opts *environmentGroupOptions) {
		opts.namespace = namespace
	}
}

// WithEnvironmentGroupName filters all environment groups by name
func WithEnvironmentGroupName(name string) EnvironmentGroupOption {
	return func(opts *environmentGroupOptions) {
		opts.environmentGroupLabelName = name
	}
}

// WithEnvironmentGroupVersion filters all environment groups by version
func WithEnvironmentGroupVersion(version int) EnvironmentGroupOption {
	return func(opts *environmentGroupOptions) {
		opts.environmentGroupLabelVersion = version
	}
}

// listEnvironmentGroups returns all environment groups stored in the provided namespace. If none is set, it will use the namespace "porter-env-group".
// This method returns all secret values, which should never be returned out of this package.  If you are trying to get the environment group values to return to the user,
// use the exported ListEnvironmentGroups instead.
func listEnvironmentGroups(ctx context.Context, a *kubernetes.Agent, listOpts ...EnvironmentGroupOption) ([]EnvironmentGroup, error) {
	ctx, span := telemetry.NewSpan(ctx, "list-environment-groups")
	defer span.End()

	var opts environmentGroupOptions
	for _, opt := range listOpts {
		opt(&opts)
	}
	if opts.namespace == "" {
		opts.namespace = Namespace_EnvironmentGroups
	}

	var labelSelectors []string
	if opts.environmentGroupLabelName != "" {
		labelSelectors = append(labelSelectors, fmt.Sprintf("%s=%s", LabelKey_EnvironmentGroupName, opts.environmentGroupLabelName))
	}
	if opts.environmentGroupLabelVersion != 0 {
		labelSelectors = append(labelSelectors, fmt.Sprintf("%s=%d", LabelKey_EnvironmentGroupVersion, opts.environmentGroupLabelVersion))
	}
	labelSelector := strings.Join(labelSelectors, ",")
	listOptions := metav1.ListOptions{
		LabelSelector: labelSelector,
	}

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "namespace", Value: opts.namespace},
		telemetry.AttributeKV{Key: "label-selector", Value: labelSelector},
	)

	configMapListResp, err := a.Clientset.CoreV1().ConfigMaps(opts.namespace).List(ctx, listOptions)
	if err != nil {
		return nil, telemetry.Error(ctx, span, err, "unable to list environment group variables")
	}
	secretListResp, err := a.Clientset.CoreV1().Secrets(opts.namespace).List(ctx, listOptions)
	if err != nil {
		return nil, telemetry.Error(ctx, span, err, "unable to list environment groups secret varialbes")
	}

	// envGroupSet's key is the environment group's versioned name
	envGroupSet := make(map[string]EnvironmentGroup)
	for _, cm := range configMapListResp.Items {
		name, ok := cm.Labels[LabelKey_EnvironmentGroupName]
		if !ok {
			continue // missing name label, not an environment group
		}
		versionString, ok := cm.Labels[LabelKey_EnvironmentGroupVersion]
		if !ok {
			continue // missing version label, not an environment group
		}
		version, err := strconv.Atoi(versionString)
		if err != nil {
			continue // invalid version label as it should be an int, not an environment group
		}

		if _, ok := envGroupSet[cm.Name]; !ok {
			envGroupSet[cm.Name] = EnvironmentGroup{}
		}
		envGroupSet[cm.Name] = EnvironmentGroup{
			Name:            name,
			Version:         version,
			Variables:       cm.Data,
			SecretVariables: envGroupSet[cm.Name].SecretVariables,
			CreatedAtUTC:    cm.CreationTimestamp.Time.UTC(),
		}
	}

	for _, secret := range secretListResp.Items {
		name, ok := secret.Labels[LabelKey_EnvironmentGroupName]
		if !ok {
			continue // missing name label, not an environment group
		}
		versionString, ok := secret.Labels[LabelKey_EnvironmentGroupVersion]
		if !ok {
			continue // missing version label, not an environment group
		}
		version, err := strconv.Atoi(versionString)
		if err != nil {
			continue // invalid version label as it should be an int, not an environment group
		}
		if _, ok := envGroupSet[secret.Name]; !ok {
			envGroupSet[secret.Name] = EnvironmentGroup{}
		}
		envGroupSet[secret.Name] = EnvironmentGroup{
			Name:            name,
			Version:         version,
			SecretVariables: secret.Data,
			Variables:       envGroupSet[secret.Name].Variables,
			CreatedAtUTC:    secret.CreationTimestamp.Time.UTC(),
		}
	}

	var envGroups []EnvironmentGroup
	for _, envGroup := range envGroupSet {
		envGroups = append(envGroups, envGroup)
	}

	return envGroups, nil
}

// EnvGroupSecretDummyValue is the value that will be returned for secret variables in environment groups
const EnvGroupSecretDummyValue = "********"

// ListEnvironmentGroups returns all environment groups stored in the provided namespace. If none is set, it will use the namespace "porter-env-group".
// This method replaces all secret values with a dummy value so that they are not exposed to the user.  If you need access to the true secret values,
// use the unexported listEnvironmentGroups instead.
func ListEnvironmentGroups(ctx context.Context, a *kubernetes.Agent, listOpts ...EnvironmentGroupOption) ([]EnvironmentGroup, error) {
	ctx, span := telemetry.NewSpan(ctx, "list-environment-groups-obscured")
	defer span.End()

	envGroups, err := listEnvironmentGroups(ctx, a, listOpts...)
	if err != nil {
		return nil, telemetry.Error(ctx, span, err, "unable to list environment groups")
	}

	for _, envGroup := range envGroups {
		for k := range envGroup.SecretVariables {
			envGroup.SecretVariables[k] = []byte(EnvGroupSecretDummyValue)
		}
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
			LabelSelector: LabelKey_LinkedEnvironmentGroup,
		})
	if err != nil {
		return nil, telemetry.Error(ctx, span, err, "unable to list linked deployment applications")
	}

	var apps []LinkedPorterApplication
	for _, d := range deployListResp.Items {
		applicationsLinkedEnvironmentGroups := strings.Split(d.Labels[LabelKey_LinkedEnvironmentGroup], ".")

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
			LabelSelector: LabelKey_LinkedEnvironmentGroup,
		})
	if err != nil {
		return nil, telemetry.Error(ctx, span, err, "unable to list linked cronjob applications")
	}

	for _, d := range cronListResp.Items {
		applicationsLinkedEnvironmentGroups := strings.Split(d.Labels[LabelKey_LinkedEnvironmentGroup], ".")
		for _, linkedEnvironmentGroup := range applicationsLinkedEnvironmentGroups {
			if linkedEnvironmentGroup == environmentGroupName {
				apps = append(apps, LinkedPorterApplication{
					Name:      d.Name,
					Namespace: d.Namespace,
				})
			}
		}
	}

	return apps, nil
}
