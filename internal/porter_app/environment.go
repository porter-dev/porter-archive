package porter_app

import (
	"context"

	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"
	"github.com/porter-dev/porter/internal/kubernetes"
	"github.com/porter-dev/porter/internal/kubernetes/environment_groups"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/telemetry"
)

type envVariarableOptions struct {
	includeSecrets bool
}

// EnvVariableOption is a function that modifies AppEnvironmentFromProto
type EnvVariableOption func(*envVariarableOptions)

// WithSecrets includes secrets in the environment groups
func WithSecrets() EnvVariableOption {
	return func(opts *envVariarableOptions) {
		opts.includeSecrets = true
	}
}

// AppEnvironmentFromProtoInput is the input struct for AppEnvironmentFromProto
type AppEnvironmentFromProtoInput struct {
	App              *porterv1.PorterApp
	DeploymentTarget *models.DeploymentTarget
	K8SAgent         *kubernetes.Agent
}

// AppEnvironmentFromProto returns all envfironment groups referenced in an app proto with their variables
func AppEnvironmentFromProto(ctx context.Context, inp AppEnvironmentFromProtoInput, varOpts ...EnvVariableOption) ([]environment_groups.EnvironmentGroup, error) {
	ctx, span := telemetry.NewSpan(ctx, "porter-app-env-from-proto")
	defer span.End()

	var envGroups []environment_groups.EnvironmentGroup

	if inp.DeploymentTarget == nil {
		return nil, telemetry.Error(ctx, span, nil, "must provide a deployment target")
	}
	if inp.K8SAgent == nil {
		return nil, telemetry.Error(ctx, span, nil, "must provide a kubernetes agent")
	}
	if inp.App == nil {
		return nil, telemetry.Error(ctx, span, nil, "must provide an app")
	}

	var opts envVariarableOptions
	for _, opt := range varOpts {
		opt(&opts)
	}

	var namespace string
	switch inp.DeploymentTarget.SelectorType {
	case models.DeploymentTargetSelectorType_Namespace:
		namespace = inp.DeploymentTarget.Selector
	default:
		return envGroups, telemetry.Error(ctx, span, nil, "deployment target selector type not supported")
	}

	for _, envGroupRef := range inp.App.EnvGroups {
		envGroup, err := environment_groups.EnvironmentGroupInTargetNamespace(ctx, inp.K8SAgent, environment_groups.EnvironmentGroupInTargetNamespaceInput{
			Name:      envGroupRef.GetName(),
			Version:   int(envGroupRef.GetVersion()),
			Namespace: namespace,
		})
		if err != nil {
			return nil, err
		}

		if !opts.includeSecrets {
			envGroup.SecretVariables = nil
		}

		envGroups = append(envGroups, envGroup)
	}

	return envGroups, nil
}
