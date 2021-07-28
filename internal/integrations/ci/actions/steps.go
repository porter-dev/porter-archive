package actions

import (
	"fmt"
	"path/filepath"
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

const configure string = `sudo porter config set-host %s
porter update --app %s
`

func getConfigurePorterStep(serverURL, porterTokenSecretName string, projectIDSecretName string, clusterIDSecretName string, appName string) GithubActionYAMLStep {
	return GithubActionYAMLStep{
		Name:    "Update Porter App",
		ID:      "configure_porter",
		Run:     fmt.Sprintf(configure, serverURL, appName),
		Timeout: 10,
		Env: GithubActionEnvConfig{
			PorterToken: fmt.Sprintf("{{ secrets.%s }}", porterTokenSecretName),
			ProjectID:   fmt.Sprintf("{{ secrets.%s }}", projectIDSecretName),
			ClusterID:   fmt.Sprintf("{{ secrets.%s }}", clusterIDSecretName),
		},
	}
}

const dockerBuildPush string = `
export $(echo "${{secrets.%s}}" | xargs)
echo "${{secrets.%s}}" > ./env_porter
sudo docker build %s $(cat ./env_porter | awk 'NF' | sed 's@^@--build-arg @g' | paste -s -d " " -) --file %s -t %s:$(git rev-parse --short HEAD)
sudo docker push %s:$(git rev-parse --short HEAD)
`

func getDockerBuildPushStep(envSecretName, dockerFilePath, repoURL string) GithubActionYAMLStep {
	return GithubActionYAMLStep{
		Name: "Docker build, push",
		ID:   "docker_build_push",
		Run:  fmt.Sprintf(dockerBuildPush, envSecretName, envSecretName, filepath.Dir(dockerFilePath), dockerFilePath, repoURL, repoURL),
	}
}

const buildPackPush string = `
export $(echo "${{secrets.%s}}" | xargs)
echo "${{secrets.%s}}" > ./env_porter
sudo add-apt-repository ppa:cncf-buildpacks/pack-cli
sudo apt-get update
sudo apt-get install pack-cli
sudo pack build %s:$(git rev-parse --short HEAD) --path %s --builder heroku/buildpacks:18 --env-file ./env_porter
sudo docker push %s:$(git rev-parse --short HEAD)
`

func getBuildPackPushStep(envSecretName, folderPath, repoURL string) GithubActionYAMLStep {
	return GithubActionYAMLStep{
		Name: "Docker build, push",
		ID:   "docker_build_push",
		Run:  fmt.Sprintf(buildPackPush, envSecretName, envSecretName, repoURL, folderPath, repoURL),
	}
}

const deployPorter string = `
curl -X POST "%s/api/webhooks/deploy/${{secrets.%s}}?commit=$(git rev-parse --short HEAD)"
`

func deployPorterWebhookStep(serverURL, webhookTokenSecretName string) GithubActionYAMLStep {
	return GithubActionYAMLStep{
		Name: "Deploy on Porter",
		ID:   "deploy_porter",
		Run:  fmt.Sprintf(deployPorter, serverURL, webhookTokenSecretName),
	}
}
