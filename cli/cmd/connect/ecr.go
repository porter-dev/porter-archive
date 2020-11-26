package connect

import (
	"context"
	"fmt"

	"github.com/fatih/color"
	"github.com/porter-dev/porter/cli/cmd/api"
	"github.com/porter-dev/porter/cli/cmd/utils"
)

// ECR creates an ECR integration
func ECR(
	client *api.Client,
	projectID uint,
) error {
	// if project ID is 0, ask the user to set the project ID or create a project
	if projectID == 0 {
		return fmt.Errorf("no project set, please run porter project set [id]")
	}

	// query for the access key id
	accessKeyID, err := utils.PromptPlaintext(fmt.Sprintf(`AWS Access Key ID: `))

	if err != nil {
		return err
	}

	// query for the secret access key
	secretKey, err := utils.PromptPlaintext(fmt.Sprintf(`AWS Secret Access Key: `))

	if err != nil {
		return err
	}

	// query for the region
	region, err := utils.PromptPlaintext(fmt.Sprintf(`AWS Region: `))

	if err != nil {
		return err
	}

	// create the aws integration
	integration, err := client.CreateAWSIntegration(
		context.Background(),
		projectID,
		&api.CreateAWSIntegrationRequest{
			AWSAccessKeyID:     accessKeyID,
			AWSSecretAccessKey: secretKey,
			AWSRegion:          region,
		},
	)

	if err != nil {
		return err
	}

	color.New(color.FgGreen).Printf("created aws integration with id %d\n", integration.ID)

	// create the registry
	// query for registry name
	regName, err := utils.PromptPlaintext(fmt.Sprintf(`Give this registry a name: `))

	if err != nil {
		return err
	}

	reg, err := client.CreateECR(
		context.Background(),
		projectID,
		&api.CreateECRRequest{
			Name:             regName,
			AWSIntegrationID: integration.ID,
		},
	)

	if err != nil {
		return err
	}

	color.New(color.FgGreen).Printf("created registry with id %d and name %s\n", reg.ID, reg.Name)

	return nil
}
