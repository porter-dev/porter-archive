package connect

import (
	"context"
	"fmt"
	"net/url"

	"github.com/porter-dev/porter/api/types"

	"github.com/fatih/color"
	api "github.com/porter-dev/porter/api/client"
	"github.com/porter-dev/porter/cli/cmd/utils"
)

func HelmRepo(
	client *api.Client,
	projectID uint,
) (uint, error) {
	// if project ID is 0, ask the user to set the project ID or create a project
	if projectID == 0 {
		return 0, fmt.Errorf("no project set, please run porter project set [id]")
	}

	repoName, err := utils.PromptPlaintext(fmt.Sprintf(`Provide the name that you would like to give this Helm registry. 
Name: `))
	if err != nil {
		return 0, err
	}

	repoURL, err := utils.PromptPlaintext(fmt.Sprintf(`Provide the Helm registry URL, make sure to include the protocol. For example, https://charts.bitnami.com/bitnami.
Registry URL: `))
	if err != nil {
		return 0, err
	}

	if _, err := url.Parse(repoURL); err != nil {
		return 0, fmt.Errorf("not a valid url: %s", err)
	}

	username, err := utils.PromptPlaintext(fmt.Sprintf(`Helm repo username (press enter for a public registry):`))
	if err != nil {
		return 0, err
	}

	password, err := utils.PromptPassword(`Helm registry password (press enter for a public registry).
Password:`)
	if err != nil {
		return 0, err
	}

	var basicIntegrationID uint = 0

	if username != "" && password != "" {
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

		basicIntegrationID = integration.ID
	}

	reg, err := client.CreateHelmRepo(
		context.Background(),
		projectID,
		&types.CreateUpdateHelmRepoRequest{
			URL:                repoURL,
			Name:               repoName,
			BasicIntegrationID: basicIntegrationID,
		},
	)
	if err != nil {
		return 0, err
	}

	color.New(color.FgGreen).Printf("created helm registry integration with id %d and name %s\n", reg.ID, reg.Name)

	return reg.ID, nil
}
