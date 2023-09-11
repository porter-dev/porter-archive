package models

import (
	"fmt"

	"github.com/launchdarkly/go-sdk-common/v3/ldcontext"
	"github.com/porter-dev/porter/internal/features"
)

func getAPITokensEnabled(context ldcontext.Context, client *features.Client) bool {
	defaultValue := false
	value, _ := client.BoolVariation("api_tokens_enabled", context, defaultValue)
	return value
}

func getAzureEnabled(context ldcontext.Context, client *features.Client) bool {
	defaultValue := false
	value, _ := client.BoolVariation("azure_enabled", context, defaultValue)
	return value
}

func getCapiProvisionerEnabled(context ldcontext.Context, client *features.Client) bool {
	defaultValue := true
	value, _ := client.BoolVariation("capi_provisioner_enabled", context, defaultValue)
	return value
}

func getEnableReprovision(context ldcontext.Context, client *features.Client) bool {
	defaultValue := false
	value, _ := client.BoolVariation("enable_reprovision", context, defaultValue)
	return value
}

func getFullAddOns(context ldcontext.Context, client *features.Client) bool {
	defaultValue := false
	value, _ := client.BoolVariation("full_add_ons", context, defaultValue)
	return value
}

func getHelmValuesEnabled(context ldcontext.Context, client *features.Client) bool {
	defaultValue := false
	value, _ := client.BoolVariation("helm_values_enabled", context, defaultValue)
	return value
}

func getManagedInfraEnabled(context ldcontext.Context, client *features.Client) bool {
	defaultValue := false
	value, _ := client.BoolVariation("managed_infra_enabled", context, defaultValue)
	return value
}

func getMultiCluster(context ldcontext.Context, client *features.Client) bool {
	defaultValue := false
	value, _ := client.BoolVariation("multi_cluster", context, defaultValue)
	return value
}

func getPreviewEnvsEnabled(context ldcontext.Context, client *features.Client) bool {
	defaultValue := false
	value, _ := client.BoolVariation("preview_envs_enabled", context, defaultValue)
	return value
}

func getRdsDatabasesEnabled(context ldcontext.Context, client *features.Client) bool {
	defaultValue := false
	value, _ := client.BoolVariation("rds_databases_enabled", context, defaultValue)
	return value
}

func getSimplifiedViewEnabled(context ldcontext.Context, client *features.Client) bool {
	defaultValue := true
	value, _ := client.BoolVariation("simplified_view_enabled", context, defaultValue)
	return value
}

func getStacksEnabled(context ldcontext.Context, client *features.Client) bool {
	defaultValue := false
	value, _ := client.BoolVariation("stacks_enabled", context, defaultValue)
	return value
}

func getValidateApplyV2(context ldcontext.Context, client *features.Client) bool {
	defaultValue := false
	value, _ := client.BoolVariation("validate_apply_v2", context, defaultValue)
	return value
}

func getProjectContext(projectID uint, projectName string) ldcontext.Context {
	projectIdentifier := fmt.Sprintf("project-%d", projectID)
	launchDarklyName := fmt.Sprintf("%s: %s", projectIdentifier, projectName)
	return ldcontext.NewBuilder(projectIdentifier).
		Kind("project").
		Name(launchDarklyName).
		SetInt("project_id", int(projectID)).
		Build()
}
