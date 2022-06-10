package actions

import (
	"fmt"
	"strings"
)

const updateAppActionName = "porter-dev/porter-update-action"
const createPreviewActionName = "porter-dev/porter-preview-action"
const deletePreviewActionName = "porter-dev/porter-delete-preview-action"

func getCheckoutCodeStep() GithubActionYAMLStep {
	return GithubActionYAMLStep{
		Name: "Checkout code",
		Uses: "actions/checkout@v2.3.4",
	}
}

func getSetTagStep() GithubActionYAMLStep {
	return GithubActionYAMLStep{
		Name: "Set Github tag",
		ID:   "vars",
		Run:  `echo "::set-output name=sha_short::$(git rev-parse --short HEAD)"`,
	}
}

func getUpdateAppStep(serverURL, porterTokenSecretName string, projectID uint, clusterID uint, appName string, appNamespace, actionVersion string) GithubActionYAMLStep {
	return GithubActionYAMLStep{
		Name: "Update Porter App",
		Uses: fmt.Sprintf("%s@%s", updateAppActionName, actionVersion),
		With: map[string]string{
			"app":       appName,
			"cluster":   fmt.Sprintf("%d", clusterID),
			"host":      serverURL,
			"project":   fmt.Sprintf("%d", projectID),
			"token":     fmt.Sprintf("${{ secrets.%s }}", porterTokenSecretName),
			"tag":       "${{ steps.vars.outputs.sha_short }}",
			"namespace": appNamespace,
		},
		Timeout: 20,
	}
}

func getCreatePreviewEnvStep(
	serverURL, porterTokenSecretName string,
	projectID, clusterID, gitInstallationID uint,
	repoOwner, repoName, actionVersion string,
) GithubActionYAMLStep {
	return GithubActionYAMLStep{
		Name: "Create Porter preview env",
		Uses: fmt.Sprintf("%s@%s", createPreviewActionName, actionVersion),
		With: map[string]string{
			"cluster": fmt.Sprintf("%d", clusterID),
			"host":    serverURL,
			"project": fmt.Sprintf("%d", projectID),
			"token":   fmt.Sprintf("${{ secrets.%s }}", porterTokenSecretName),
			"namespace": fmt.Sprintf("pr-${{ github.event.inputs.pr_number }}-%s",
				strings.ToLower(strings.ReplaceAll(repoName, "_", "-"))),
			"pr_id":           "${{ github.event.inputs.pr_number }}",
			"pr_name":         "${{ github.event.inputs.pr_title }}",
			"installation_id": fmt.Sprintf("%d", gitInstallationID),
			"pr_branch_from":  "${{ github.event.inputs.pr_branch_from }}",
			"pr_branch_into":  "${{ github.event.inputs.pr_branch_into }}",
			"action_id":       "${{ github.run_id }}",
			"repo_owner":      repoOwner,
			"repo_name":       repoName,
		},
		Timeout: 30,
	}
}

func getDeletePreviewEnvStep(serverURL, porterTokenSecretName string, projectID, clusterID uint, repoName, actionVersion string) GithubActionYAMLStep {
	return GithubActionYAMLStep{
		Name: "Delete Porter preview env",
		Uses: fmt.Sprintf("%s@%s", deletePreviewActionName, actionVersion),
		With: map[string]string{
			"cluster":       fmt.Sprintf("%d", clusterID),
			"host":          serverURL,
			"project":       fmt.Sprintf("%d", projectID),
			"token":         fmt.Sprintf("${{ secrets.%s }}", porterTokenSecretName),
			"deployment_id": "${{ github.event.inputs.deployment_id }}",
		},
		Timeout: 30,
	}
}
