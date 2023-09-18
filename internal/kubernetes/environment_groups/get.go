package environment_groups

import (
	"context"

	"github.com/porter-dev/porter/internal/kubernetes"
	"github.com/porter-dev/porter/internal/telemetry"
)

// LatestBaseEnvironmentGroup returns the most recent version of an environment group stored in the porter-env-group namespace.
// It replaces all secret values with a dummy variable and can be used to return values to the user.  If you need access to the true secret values,
// use the private latestBaseEnvironmentGroup function instead.
func LatestBaseEnvironmentGroup(ctx context.Context, a *kubernetes.Agent, environmentGroupName string) (EnvironmentGroup, error) {
	ctx, span := telemetry.NewSpan(ctx, "latest-base-env-group")
	defer span.End()
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "environment-group-name", Value: environmentGroupName})

	var eg EnvironmentGroup

	baseEnvironmentGroupVersions, err := ListEnvironmentGroups(ctx, a, WithEnvironmentGroupName(environmentGroupName), WithNamespace(Namespace_EnvironmentGroups))
	if err != nil {
		return eg, telemetry.Error(ctx, span, err, "unable to list base environment groups")
	}

	var highestVersionEnvironmentGroup EnvironmentGroup
	for _, baseEnvironmentGroup := range baseEnvironmentGroupVersions {
		if baseEnvironmentGroup.Version > highestVersionEnvironmentGroup.Version {
			highestVersionEnvironmentGroup = baseEnvironmentGroup
		}
	}

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "highest-version", Value: highestVersionEnvironmentGroup.Version},
		telemetry.AttributeKV{Key: "highest-version-name", Value: highestVersionEnvironmentGroup.Name},
	)

	return highestVersionEnvironmentGroup, nil
}

// latestBaseEnvironmentGroup returns the most recent version of an environment group stored in the porter-env-group namespace.
// This is a private function because it returns all secret values.  If you are trying to retrieve the latest base environment group to return to the user,
// use the exported LatestBaseEnvironmentGroup instead.
func latestBaseEnvironmentGroup(ctx context.Context, a *kubernetes.Agent, environmentGroupName string) (EnvironmentGroup, error) {
	ctx, span := telemetry.NewSpan(ctx, "latest-base-env-group-private")
	defer span.End()
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "environment-group-name", Value: environmentGroupName})

	var eg EnvironmentGroup

	baseEnvironmentGroupVersions, err := listEnvironmentGroups(ctx, a, WithEnvironmentGroupName(environmentGroupName), WithNamespace(Namespace_EnvironmentGroups))
	if err != nil {
		return eg, telemetry.Error(ctx, span, err, "unable to list base environment groups")
	}

	var highestVersionEnvironmentGroup EnvironmentGroup
	for _, baseEnvironmentGroup := range baseEnvironmentGroupVersions {
		if baseEnvironmentGroup.Version > highestVersionEnvironmentGroup.Version {
			highestVersionEnvironmentGroup = baseEnvironmentGroup
		}
	}

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "highest-version", Value: highestVersionEnvironmentGroup.Version},
		telemetry.AttributeKV{Key: "highest-version-name", Value: highestVersionEnvironmentGroup.Name},
	)

	return highestVersionEnvironmentGroup, nil
}

// EnvironmentGroupInTargetNamespaceInput contains all information required to check if an environment group exists in a target namespace.
// If you are looking for envrionment groups in the base namespace, consider using LatestBaseEnvironmentGroup or ListBaseEnvironmentGroups instead
type EnvironmentGroupInTargetNamespaceInput struct {
	// Name is the environment group name which can be found on the configmap label
	Name      string
	Version   int
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
	if inp.Version == 0 {
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

	environmentGroups, err := ListEnvironmentGroups(ctx, a, WithEnvironmentGroupName(inp.Name), WithEnvironmentGroupVersion(inp.Version), WithNamespace(inp.Namespace))
	if err != nil {
		return eg, telemetry.Error(ctx, span, err, "unable to list environment groups in target namespace")
	}

	if len(environmentGroups) > 1 {
		telemetry.WithAttributes(span,
			telemetry.AttributeKV{Key: "expected-results", Value: 1},
			telemetry.AttributeKV{Key: "actual-results", Value: len(environmentGroups)},
		)
		return eg, telemetry.Error(ctx, span, nil, "unexpected number of versions found in namespace")
	}

	if len(environmentGroups) == 1 {
		return environmentGroups[0], nil
	}

	return eg, nil
}
