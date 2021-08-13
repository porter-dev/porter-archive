package actions

import (
	"fmt"
)

func getCheckoutCodeStep() GithubActionYAMLStep {
	return GithubActionYAMLStep{
		Name: "Checkout code",
		Uses: "actions/checkout@v2.3.4",
	}
}

func getUpdateAppStep(serverURL, porterTokenSecretName string, projectID uint, clusterID uint, appName string) GithubActionYAMLStep {
	return GithubActionYAMLStep{
		Name: "Update Porter App",
		// TODO: tag a version (v2.0.0?) and pin here
		Uses: "porter-dev/porter-update-action@main",
		With: map[string]string{
			"app":     appName,
			"cluster": fmt.Sprintf("%d", clusterID),
			"host":    serverURL,
			"project": fmt.Sprintf("%d", projectID),
			"token":   fmt.Sprintf("${{ secrets.%s }}", porterTokenSecretName),
		},
		Timeout: 20,
	}
}
