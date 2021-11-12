package provision

import (
	"fmt"
	"time"

	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/internal/kubernetes/provisioner"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/random"
	"golang.org/x/crypto/bcrypt"
)

func CreateCEToken(conf *config.Config, infra *models.Infra) (*models.CredentialsExchangeToken, string, error) {
	// convert the form to a project model
	expiry := time.Now().Add(6 * time.Hour)

	rawToken, err := random.StringWithCharset(32, "")

	if err != nil {
		return nil, "", err
	}

	hashedToken, err := bcrypt.GenerateFromPassword([]byte(rawToken), 8)

	if err != nil {
		return nil, "", err
	}

	ceToken := &models.CredentialsExchangeToken{
		ProjectID:       infra.ProjectID,
		Expiry:          &expiry,
		Token:           hashedToken,
		DOCredentialID:  infra.DOIntegrationID,
		AWSCredentialID: infra.AWSIntegrationID,
		GCPCredentialID: infra.GCPIntegrationID,
	}

	// handle write to the database
	ceToken, err = conf.Repo.CredentialsExchangeToken().CreateCredentialsExchangeToken(ceToken)

	if err != nil {
		return nil, "", err
	}

	return ceToken, rawToken, nil
}

func GetSharedProvisionerOpts(conf *config.Config, infra *models.Infra) (*provisioner.ProvisionOpts, error) {
	ceToken, rawToken, err := CreateCEToken(conf, infra)

	if err != nil {
		return nil, err
	}

	return &provisioner.ProvisionOpts{
		DryRun:              true,
		Infra:               infra,
		ProvImageTag:        conf.ServerConf.ProvisionerImageTag,
		ProvJobNamespace:    conf.ServerConf.ProvisionerJobNamespace,
		ProvImagePullSecret: conf.ServerConf.ProvisionerImagePullSecret,
		TFHTTPBackendURL:    conf.ServerConf.ProvisionerBackendURL,
		CredentialExchange: &provisioner.ProvisionCredentialExchange{
			CredExchangeEndpoint: fmt.Sprintf("%s/api/internal/credentials", conf.ServerConf.ProvisionerCredExchangeURL),
			CredExchangeToken:    rawToken,
			CredExchangeID:       ceToken.ID,
		},
	}, nil
}
