package connect

import (
	"context"
	"fmt"
	"io/ioutil"
	"os"

	"github.com/fatih/color"
	"github.com/porter-dev/porter/cli/cmd/api"
	"github.com/porter-dev/porter/cli/cmd/utils"
)

// GCR creates a GCR integration
func GCR(
	client *api.Client,
	projectID uint,
) (uint, error) {
	// if project ID is 0, ask the user to set the project ID or create a project
	if projectID == 0 {
		return 0, fmt.Errorf("no project set, please run porter project set [id]")
	}

	keyFileLocation, err := utils.PromptPlaintext(fmt.Sprintf(`Please provide the full path to a service account key file.
Key file location: `))

	if err != nil {
		return 0, err
	}

	// attempt to read the key file location
	if info, err := os.Stat(keyFileLocation); !os.IsNotExist(err) && !info.IsDir() {
		// read the file
		bytes, err := ioutil.ReadFile(keyFileLocation)

		if err != nil {
			return 0, err
		}

		// create the aws integration
		integration, err := client.CreateGCPIntegration(
			context.Background(),
			projectID,
			&api.CreateGCPIntegrationRequest{
				GCPKeyData: string(bytes),
			},
		)

		if err != nil {
			return 0, err
		}

		color.New(color.FgGreen).Printf("created gcp integration with id %d\n", integration.ID)

		// create the registry
		// query for registry name
		regName, err := utils.PromptPlaintext(fmt.Sprintf(`Give this registry a name: `))

		if err != nil {
			return 0, err
		}

		reg, err := client.CreateGCR(
			context.Background(),
			projectID,
			&api.CreateGCRRequest{
				Name:             regName,
				GCPIntegrationID: integration.ID,
			},
		)

		if err != nil {
			return 0, err
		}

		color.New(color.FgGreen).Printf("created registry with id %d and name %s\n", reg.ID, reg.Name)

		return reg.ID, nil
	}

	return 0, fmt.Errorf("could not read service account key file")
}
