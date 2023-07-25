package environment_groups

import (
	"context"
	"fmt"

	"github.com/porter-dev/porter/internal/kubernetes"
	"github.com/porter-dev/porter/internal/telemetry"
)

// SyncLatestVersionToNamespaceInput contains all information required to sync an environment group from the porter-env-group namespace
// to the given target namespace
type SyncLatestVersionToNamespaceInput struct {
	BaseEnvironmentGroupName string
	TargetNamespace          string
}

// SyncLatestVersionToNamespaceOutput returns the literal configmap name (as opposed to the environment group name) which can be used in kubernetes manifests
// for loading the configmap (or secret) into a deployment, or job
type SyncLatestVersionToNamespaceOutput struct {
	// EnvironmentGroupVersionedName is the name of the secret and configmap which should be able to be used in kubernetes manifests. This must already exist as both a configmap and a secret in the given namespace before being returned.
	// EnvironmentGroupVersionedName will be of the format "<environment-group-name>.<version>"
	EnvironmentGroupVersionedName string
}

// SyncLatestVersionToNamespace gets the latest version of a given environment group, and makes a copy of it in the target
// namespace. If the versions match, no changes will be made. In either case, the name of an environment group in the target namespace will be returned
// unless an error has occurred.
func SyncLatestVersionToNamespace(ctx context.Context, a *kubernetes.Agent, inp SyncLatestVersionToNamespaceInput) (SyncLatestVersionToNamespaceOutput, error) {
	ctx, span := telemetry.NewSpan(ctx, "sync-env-group-version-to-namespace")
	defer span.End()

	var output SyncLatestVersionToNamespaceOutput

	if inp.BaseEnvironmentGroupName == "" {
		return output, nil
	}
	if inp.TargetNamespace == "" {
		return output, telemetry.Error(ctx, span, nil, "must provide a target environment group namespace to sync to")
	}

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "environment-group-name", Value: inp.BaseEnvironmentGroupName},
		telemetry.AttributeKV{Key: "target-environment-namespace", Value: inp.TargetNamespace},
	)

	fmt.Println("STEFANSYNC0")
	baseEnvironmentGroup, err := LatestBaseEnvironmentGroup(ctx, a, inp.BaseEnvironmentGroupName)
	if err != nil {
		return output, telemetry.Error(ctx, span, err, "unable to find latest environment group version")
	}
	fmt.Println("STEFANSYNC1", baseEnvironmentGroup)

	envGroupInp := EnvironmentGroupInTargetNamespaceInput{
		Name:      baseEnvironmentGroup.Name,
		Version:   baseEnvironmentGroup.Version,
		Namespace: inp.TargetNamespace,
	}
	targetEnvironmentGroup, err := EnvironmentGroupInTargetNamespace(ctx, a, envGroupInp)
	if err != nil {
		return output, telemetry.Error(ctx, span, err, "unable to get environement group in target namespace")
	}

	fmt.Println("STEFANSYNC2", targetEnvironmentGroup.Name, baseEnvironmentGroup.Name, targetEnvironmentGroup.Version, baseEnvironmentGroup.Version)
	if targetEnvironmentGroup.Name == baseEnvironmentGroup.Name && targetEnvironmentGroup.Version == baseEnvironmentGroup.Version {
		return SyncLatestVersionToNamespaceOutput{
			EnvironmentGroupVersionedName: fmt.Sprintf("%s.%d", baseEnvironmentGroup.Name, baseEnvironmentGroup.Version),
		}, nil
	}
	fmt.Println("STEFANSYNC3")

	targetConfigmapName, err := createEnvironmentGroupInTargetNamespace(ctx, a, inp.TargetNamespace, baseEnvironmentGroup)
	if err != nil {
		return output, telemetry.Error(ctx, span, err, "unable to create environment group in target namespace")
	}
	fmt.Println("STEFANSYNC4")

	output = SyncLatestVersionToNamespaceOutput{
		EnvironmentGroupVersionedName: targetConfigmapName,
	}

	return output, nil
}
