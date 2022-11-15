package connect

import (
	"context"
	"fmt"
	"os"
	"strings"

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

	keyFileLocation, err := utils.PromptPlaintext(`Please provide the full path to a service account key file.
Key file location: `)

	if err != nil {
		return 0, err
	}

	// attempt to read the key file location
	if info, err := os.Stat(keyFileLocation); !os.IsNotExist(err) && !info.IsDir() {
		// read the file
		bytes, err := os.ReadFile(keyFileLocation)

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

		region, err := utils.PromptPlaintext(`Please enter the artifact registry region. For example, us-central1.
Artifact registry region: `)

		if err != nil {
			return 0, err
		}

		// create the registry
		// query for registry name
		regName, err := utils.PromptPlaintext("Give this registry a name: ")

		if err != nil {
			return 0, err
		}

		// GCP project IDs can have the ':' character like example.com:my-project
		// if this is the case then we need to case on this
		//
		// see: https://cloud.google.com/artifact-registry/docs/docker/names#domain
		var registryURL string

		if domain, projectID, found := strings.Cut(integration.GCPProjectID, ":"); found {
			if domain == "" || projectID == "" {
				return 0, fmt.Errorf("invalid project ID: %s", integration.GCPProjectID)
			}

			registryURL = fmt.Sprintf("%s-docker.pkg.dev/%s/%s", region, domain, projectID)
		} else {
			registryURL = fmt.Sprintf("%s-docker.pkg.dev/%s", region, integration.GCPProjectID)
		}

		reg, err := client.CreateRegistry(
			context.Background(),
			projectID,
			&types.CreateRegistryRequest{
				Name:             regName,
				GCPIntegrationID: integration.ID,
				URL:              registryURL,
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
