package connect

import (
	"context"
	"fmt"
	"io/ioutil"
	"os"

	"github.com/fatih/color"

	api "github.com/porter-dev/porter/api/client"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/cli/cmd/utils"
)

// GAR creates a GAR integration
func GAR(
	client *api.Client,
	projectID uint,
) (uint, error) {
	// if project ID is 0, ask the user to set the project ID or create a project
	if projectID == 0 {
		return 0, fmt.Errorf("no project set, please run porter config set-project")
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

		// create the gcp integration
		integration, err := client.CreateGCPIntegration(
			context.Background(),
			projectID,
			&types.CreateGCPRequest{
				GCPKeyData: string(bytes),
			},
		)

		if err != nil {
			return 0, err
		}

		color.New(color.FgGreen).Printf("created gcp integration with id %d\n", integration.ID)

		region, err := utils.PromptPlaintext(fmt.Sprintf(`Please enter the artifact registry region. For example, us-central-1.
Artifact registry region: `))

		if err != nil {
			return 0, err
		}

		// create the registry
		// query for registry name
		regName, err := utils.PromptPlaintext(fmt.Sprintf(`Give this registry a name: `))

		if err != nil {
			return 0, err
		}

		reg, err := client.CreateRegistry(
			context.Background(),
			projectID,
			&types.CreateRegistryRequest{
				Name:             regName,
				GCPIntegrationID: integration.ID,
				URL:              region + "-docker.pkg.dev/" + integration.GCPProjectID,
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
