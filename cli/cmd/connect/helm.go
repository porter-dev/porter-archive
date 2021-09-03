package connect

import (
	"context"
	"fmt"
	"github.com/porter-dev/porter/api/types"
	"strings"

	"github.com/fatih/color"
	api "github.com/porter-dev/porter/api/client"
	"github.com/porter-dev/porter/cli/cmd/utils"
)

// Helm connects a Helm repository using HTTP basic authentication
func Helm(
	client *api.Client,
	projectID uint,
) (uint, error) {
	// if project ID is 0, ask the user to set the project ID or create a project
	if projectID == 0 {
		return 0, fmt.Errorf("no project set, please run porter project set [id]")
	}

	// query for helm repo name
	helmName, err := utils.PromptPlaintext(fmt.Sprintf(`Give this Helm repository a name: `))

	if err != nil {
		return 0, err
	}

	repoURL, err := utils.PromptPlaintext(fmt.Sprintf(`Provide the Helm repository URL: `))

	if err != nil {
		return 0, err
	}

	userResp, err := utils.PromptPlaintext(
		fmt.Sprintf(`Does this endpoint require a username/password to authenticate? %s `,
			color.New(color.FgCyan).Sprintf("[y/n]"),
		),
	)

	if err != nil {
		return 0, err
	}

	username := ""
	password := ""

	if userResp := strings.ToLower(userResp); userResp == "y" || userResp == "yes" {
		username, err = utils.PromptPlaintext(fmt.Sprintf(`Username: `))

		if err != nil {
			return 0, err
		}

		password, err = utils.PromptPasswordWithConfirmation()

		if err != nil {
			return 0, err
		}
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

	// create the helm repo
	hr, err := client.CreateHelmRepo(
		context.Background(),
		projectID,
		&api.CreateHelmRepoRequest{
			Name:               helmName,
			RepoURL:            repoURL,
			BasicIntegrationID: integration.ID,
		},
	)

	if err != nil {
		return 0, err
	}

	color.New(color.FgGreen).Printf("created helm repo with id %d and name %s\n", hr.ID, hr.Name)

	return hr.ID, nil
}
