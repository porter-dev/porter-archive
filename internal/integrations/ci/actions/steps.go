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
		Uses: "porter-dev/porter-update-action@v0.1.0",
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
