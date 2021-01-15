package connect

import (
	"context"
	"fmt"
	"strings"

	"github.com/porter-dev/porter/cli/cmd/api"
	"github.com/porter-dev/porter/cli/cmd/utils"

	ints "github.com/porter-dev/porter/internal/models/integrations"
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

	linkedDO := false
	var doAuth ints.OAuthIntegrationExternal

	// iterate through oauth integrations to find do
	for _, oauthInt := range oauthInts {
		if oauthInt.Client == ints.OAuthDigitalOcean {
			linkedDO = true
			doAuth = oauthInt
			break
		}
	}

	if !linkedDO {
		doAuth, err = triggerDigitalOceanOAuth(projectID)

		if err != nil {
			return 0, err
		}
	}

	// use the digital ocean oauth to create a registry
	regURL, err := utils.PromptPlaintext(fmt.Sprintf(`Please provide the registry URL, in the form registry.digitalocean.com/[REGISTRY_NAME]. For example, registry.digitalocean.com/porter-test. 
Registry URL: `))

	if err != nil {
		return 0, err
	}

	urlArr := strings.Split(regURL, "/")
	regName := urlArr[len(urlArr)-1]

	if err != nil {
		return 0, err
	}

	reg, err := client.CreateDOCR(
		context.Background(),
		projectID,
		&api.CreateDOCRRequest{
			Name:            regName,
			DOIntegrationID: doAuth.ID,
			URL:             regURL,
		},
	)

	return reg.ID, nil
}

func triggerDigitalOceanOAuth(projectID uint) (ints.OAuthIntegrationExternal, error) {
	return ints.OAuthIntegrationExternal{}, nil
}
