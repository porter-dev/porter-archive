package provision

import (
	"fmt"
	"net/http"
	"time"

	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/random"
	"github.com/porter-dev/porter/provisioner/integrations/provisioner"
	"github.com/porter-dev/porter/provisioner/server/config"
	"golang.org/x/crypto/bcrypt"

	ptypes "github.com/porter-dev/porter/provisioner/types"
)

type ProvisionCreateHandler struct {
	Config *config.Config

	decoderValidator shared.RequestDecoderValidator
	resultWriter     shared.ResultWriter
}

func NewProvisionCreateHandler(
	config *config.Config,
) *ProvisionCreateHandler {
	return &ProvisionCreateHandler{
		Config:           config,
		decoderValidator: shared.NewDefaultRequestDecoderValidator(config.Logger, config.Alerter),
		resultWriter:     shared.NewDefaultResultWriter(config.Logger, config.Alerter),
	}
}

func (c *ProvisionCreateHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// read the project and infra from the attached scope
	project, _ := r.Context().Value(types.ProjectScope).(*models.Project)
	infra, _ := r.Context().Value(types.InfraScope).(*models.Infra)

	req := &ptypes.ProvisionBaseRequest{}

	if ok := c.decoderValidator.DecodeAndValidate(w, r, req); !ok {
		return
	}

	fmt.Printf("provisioning: %d, %d\n", project.ID, infra.ID)

	// create a new operation and write it to the database
	operationUID, err := models.GetOperationID()

	if err != nil {
		apierrors.HandleAPIError(c.Config.Logger, c.Config.Alerter, w, r, apierrors.NewErrInternal(err), true)
		return
	}

	operation := &models.Operation{
		UID:     operationUID,
		InfraID: infra.ID,
		Type:    "create",
		Status:  "starting",
	}

	fmt.Println("OPERATION IS", operation)

	operation, err = c.Config.Repo.Infra().AddOperation(infra, operation)

	if err != nil {
		apierrors.HandleAPIError(c.Config.Logger, c.Config.Alerter, w, r, apierrors.NewErrInternal(err), true)
		return
	}

	ceToken, rawToken, err := createCredentialsExchangeToken(c.Config, infra)

	if err != nil {
		apierrors.HandleAPIError(c.Config.Logger, c.Config.Alerter, w, r, apierrors.NewErrInternal(err), true)
		return
	}

	// spawn a new provisioning process
	err = provisioner.Provision(&provisioner.ProvisionOpts{
		Infra:         infra,
		Config:        c.Config,
		OperationKind: provisioner.Apply,
		Kind:          req.Kind,
		Values:        req.Values,
		CredentialExchange: &provisioner.ProvisionCredentialExchange{
			CredExchangeEndpoint: fmt.Sprintf(
				"%s/api/v1/%s/credentials",
				c.Config.ProvisionerConf.ProvisionerCredExchangeURL,
				models.GetWorkspaceID(infra, operation),
			),
			CredExchangeToken: rawToken,
			CredExchangeID:    ceToken.ID,
		},
	}, c.Config.ProvisionerAgent.Clientset)

	if err != nil {
		apierrors.HandleAPIError(c.Config.Logger, c.Config.Alerter, w, r, apierrors.NewErrInternal(err), true)
		return
	}

	// return the operation response type to the server
	c.resultWriter.WriteResult(w, r, operation.ToOperationType())
}

func createCredentialsExchangeToken(conf *config.Config, infra *models.Infra) (*models.CredentialsExchangeToken, string, error) {
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
