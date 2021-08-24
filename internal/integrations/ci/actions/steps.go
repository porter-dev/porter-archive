package actions

import (
	"fmt"
)

const updateAppActionName = "porter-dev/porter-update-action"

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
