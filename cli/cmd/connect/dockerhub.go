package connect

import (
	"context"
	"fmt"

	"github.com/porter-dev/porter/api/types"

	"github.com/fatih/color"
	api "github.com/porter-dev/porter/api/client"
	"github.com/porter-dev/porter/cli/cmd/utils"
)

func Dockerhub(
	client *api.Client,
	projectID uint,
) (uint, error) {
	// if project ID is 0, ask the user to set the project ID or create a project
	if projectID == 0 {
		return 0, fmt.Errorf("no project set, please run porter project set [id]")
	}

	// query for dockerhub name

	repoName, err := utils.PromptPlaintext("Provide the Docker Hub organization name. For example, if your Docker Hub repository is 'myorg/myrepo', enter 'myorg'.\nName: ")

	if err != nil {
		return 0, err
	}

	username, err := utils.PromptPlaintext("Docker Hub username: ")

	if err != nil {
		return 0, err
	}

	password, err := utils.PromptPassword("Provide the Docker Hub personal access token.\nToken: ")

	if err != nil {
		return 0, err
	}

	// create the basic auth integration
	integration, err := client.CreateBasicAuthIntegration(
		context.Background(),
		projectID,
		&types.CreateBasicRequest{
			Username: username,
			Password: password,
		},
	)

	if err != nil {
		return 0, err
	}

	color.New(color.FgGreen).Printf("created basic auth integration with id %d\n", integration.ID)

	reg, err := client.CreateRegistry(
		context.Background(),
		projectID,
		&types.CreateRegistryRequest{
			URL:                fmt.Sprintf("index.docker.io/%s", repoName),
			Name:               repoName,
			BasicIntegrationID: integration.ID,
		},
	)

	if err != nil {
		return 0, err
	}

	color.New(color.FgGreen).Printf("created private registry with id %d and name %s\n", reg.ID, reg.Name)

	return reg.ID, nil
}
