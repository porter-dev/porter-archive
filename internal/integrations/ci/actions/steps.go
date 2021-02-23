package actions

import "fmt"

func getCheckoutCodeStep() GithubActionYAMLStep {
	return GithubActionYAMLStep{
		Name: "Checkout code",
		Uses: "actions/checkout@v2.3.4",
	}
}

const download string = `
name=$(curl -s https://api.github.com/repos/porter-dev/porter/releases/latest | grep "browser_download_url.*/porter_.*_Linux_x86_64\.zip" | cut -d ":" -f 2,3 | tr -d \")
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

const configure string = `
porter auth login --token ${{secrets.%s}}
sudo porter docker configure
`

func getConfigurePorterStep(porterTokenSecretName string) GithubActionYAMLStep {
	return GithubActionYAMLStep{
		Name: "Configure Porter",
		ID:   "configure_porter",
		Run:  fmt.Sprintf(configure, porterTokenSecretName),
	}
}

const dockerBuildPush string = `
docker build . --file %s -t %s:$(git rev-parse --short HEAD)
docker push %s:$(git rev-parse --short HEAD)
`

func getDockerBuildPushStep(dockerFilePath, repoURL string) GithubActionYAMLStep {
	return GithubActionYAMLStep{
		Name: "Docker build, push",
		ID:   "docker_build_push",
		Run:  fmt.Sprintf(dockerBuildPush, dockerFilePath, repoURL, repoURL),
	}
}

const deployPorter string = `
curl -X POST "https://dashboard.getporter.dev/api/webhooks/deploy/${{secrets.%s}}?commit=$(git rev-parse --short HEAD)&repository=%s"
`

func deployPorterWebhookStep(webhookTokenSecretName, repoURL string) GithubActionYAMLStep {
	return GithubActionYAMLStep{
		Name: "Deploy on Porter",
		ID:   "deploy_porter",
		Run:  fmt.Sprintf(deployPorter, webhookTokenSecretName, repoURL),
	}
}
