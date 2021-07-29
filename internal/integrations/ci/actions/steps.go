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

const download string = `name=$(curl -s https://api.github.com/repos/porter-dev/porter/releases/latest | grep "browser_download_url.*/porter_.*_Linux_x86_64\.zip" | cut -d ":" -f 2,3 | tr -d \")
name=$(basename $name)
curl -L https://github.com/porter-dev/porter/releases/latest/download/$name --output $name
unzip -a $name
rm $name
chmod +x ./porter
sudo mv ./porter /usr/local/bin/porter
`

func getDownloadPorterStep() GithubActionYAMLStep {
	return GithubActionYAMLStep{
		Name: "Download Porter",
		ID:   "download_porter",
		Run:  download,
	}
}

const configure string = `porter update --app %s`

func getConfigurePorterStep(serverURL, porterTokenSecretName string, projectID uint, clusterID uint, appName string) GithubActionYAMLStep {
	return GithubActionYAMLStep{
		Name:    "Update Porter App",
		ID:      "update_porter",
		Run:     fmt.Sprintf(configure, appName),
		Timeout: 10,
		Env: map[string]string{
			"PORTER_TOKEN":   fmt.Sprintf("${{ secrets.%s }}", porterTokenSecretName),
			"PORTER_HOST":    serverURL,
			"PORTER_PROJECT": fmt.Sprintf("%d", projectID),
			"PORTER_CLUSTER": fmt.Sprintf("%d", clusterID),
		},
	}
}
