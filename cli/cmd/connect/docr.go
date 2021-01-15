package connect

import (
	"context"
	"fmt"

	"github.com/porter-dev/porter/cli/cmd/api"
)

// DOCR creates a DOCR integration
func DOCR(
	client *api.Client,
	projectID uint,
) (uint, error) {
	// if project ID is 0, ask the user to set the project ID or create a project
	if projectID == 0 {
		return 0, fmt.Errorf("no project set, please run porter project set [id]")
	}

	// list oauth integrations and make sure DO exists
	oauthInts, err := client.ListOAuthIntegrations(context.TODO(), projectID)

	if err != nil {
		return 0, err
	}

	fmt.Println(oauthInts)

	// 	userResp, err := utils.PromptPlaintext(
	// 		fmt.Sprintf(`Porter can set up an IAM user in your AWS account to connect to this ECR instance automatically.
	// Would you like to proceed? %s `,
	// 			color.New(color.FgCyan).Sprintf("[y/n]"),
	// 		),
	// 	)

	// 	if err != nil {
	// 		return 0, err
	// 	}

	// 	if userResp := strings.ToLower(userResp); userResp == "y" || userResp == "yes" {
	// 		agent := awsLocal.NewDefaultAgent()

	// 		creds, err := agent.CreateIAMECRUser(region)

	// 		if err != nil {
	// 			color.New(color.FgRed).Printf("Automatic creation failed, manual input required. Error was: %v\n", err)
	// 			return ecrManual(client, projectID, region)
	// 		}

	// 		waitForAuthorizationToken(region, creds)

	// 		integration, err := client.CreateAWSIntegration(
	// 			context.Background(),
	// 			projectID,
	// 			&api.CreateAWSIntegrationRequest{
	// 				AWSAccessKeyID:     creds.AWSAccessKeyID,
	// 				AWSSecretAccessKey: creds.AWSSecretAccessKey,
	// 				AWSRegion:          region,
	// 			},
	// 		)

	// 		if err != nil {
	// 			return 0, err
	// 		}

	// 		color.New(color.FgGreen).Printf("created aws integration with id %d\n", integration.ID)

	// 		return linkRegistry(client, projectID, integration.ID)
	// 	}

	// 	return ecrManual(client, projectID, region)

	return 0, nil
}
