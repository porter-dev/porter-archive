package actions

import (
	"fmt"
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

func getCreatePreviewEnvStep(serverURL, porterTokenSecretName string, projectID, clusterID, gitInstallationID uint, repoName, actionVersion string) GithubActionYAMLStep {
	return GithubActionYAMLStep{
		Name: "Create Porter preview env",
		Uses: fmt.Sprintf("%s@%s", createPreviewActionName, actionVersion),
		With: map[string]string{
			"cluster":         fmt.Sprintf("%d", clusterID),
			"host":            serverURL,
			"project":         fmt.Sprintf("%d", projectID),
			"token":           fmt.Sprintf("${{ secrets.%s }}", porterTokenSecretName),
			"namespace":       fmt.Sprintf("pr-${{ github.event.pull_request.number }}-%s", repoName),
			"pr_id":           "${{ github.event.pull_request.number }}",
			"pr_name":		   "${{ github.event.pull_request.title }}",
			"installation_id": fmt.Sprintf("%d", gitInstallationID),
			"branch":          "${{ github.head_ref }}",
			"action_id":       "${{ github.run_id }}",
			"repo_owner":      "${{ github.repository_owner }}",
			"repo_name":       fmt.Sprintf("%s", repoName),
		},
		Timeout: 30,
	}
}

func getDeletePreviewEnvStep(serverURL, porterTokenSecretName string, projectID, clusterID, gitInstallationID uint, repoName, actionVersion string) GithubActionYAMLStep {
	return GithubActionYAMLStep{
		Name: "Delete Porter preview env",
		Uses: fmt.Sprintf("%s@%s", deletePreviewActionName, actionVersion),
		With: map[string]string{
			"cluster":         fmt.Sprintf("%d", clusterID),
			"host":            serverURL,
			"project":         fmt.Sprintf("%d", projectID),
			"token":           fmt.Sprintf("${{ secrets.%s }}", porterTokenSecretName),
			"namespace":       fmt.Sprintf("pr-${{ github.event.pull_request.number }}-%s", repoName),
			"installation_id": fmt.Sprintf("%d", gitInstallationID),
		},
		Timeout: 30,
	}
}
