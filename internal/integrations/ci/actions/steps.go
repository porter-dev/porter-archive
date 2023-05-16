package actions

import (
	"fmt"
	"strings"
)

const (
	updateAppActionName     = "porter-dev/porter-update-action"
	createPreviewActionName = "porter-dev/porter-preview-action"
	cliActionName           = "porter-dev/porter-cli-action"
)

func getCheckoutCodeStep() GithubActionYAMLStep {
	return GithubActionYAMLStep{
		Name: "Checkout code",
		Uses: "actions/checkout@v3",
	}
}

func getSetTagStep() GithubActionYAMLStep {
	return GithubActionYAMLStep{
		Name: "Set Github tag",
		ID:   "vars",
		Run:  `echo "sha_short=$(git rev-parse --short HEAD)" >> $GITHUB_OUTPUT`,
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

func getDeployStackStep(
	serverURL, porterTokenSecretName, stackName, actionVersion, porterYamlPath string,
	projectID, clusterID uint,
) GithubActionYAMLStep {
	var path string
	if porterYamlPath != "" {
		path = porterYamlPath
	} else {
		path = "porter.yaml"
	}
	return GithubActionYAMLStep{
		Name: "Deploy stack",
		Uses: fmt.Sprintf("%s@%s", cliActionName, actionVersion),
		With: map[string]string{
			"command": fmt.Sprintf("apply -f %s", path),
		},
		Env: map[string]string{
			"PORTER_CLUSTER":    fmt.Sprintf("%d", clusterID),
			"PORTER_HOST":       serverURL,
			"PORTER_PROJECT":    fmt.Sprintf("%d", projectID),
			"PORTER_TOKEN":      fmt.Sprintf("${{ secrets.%s }}", porterTokenSecretName),
			"PORTER_TAG":        "${{ steps.vars.outputs.sha_short }}",
			"PORTER_STACK_NAME": stackName,
		},
		Timeout: 30,
	}
}
