package provision

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/provisioner/integrations/provisioner"
	"github.com/porter-dev/porter/provisioner/server/config"

	ptypes "github.com/porter-dev/porter/provisioner/types"
)

type ProvisionDestroyHandler struct {
	Config *config.Config

	decoderValidator shared.RequestDecoderValidator
	resultWriter     shared.ResultWriter
}

func NewProvisionDestroyHandler(
	config *config.Config,
) *ProvisionDestroyHandler {
	return &ProvisionDestroyHandler{
		Config:           config,
		decoderValidator: shared.NewDefaultRequestDecoderValidator(config.Logger, config.Alerter),
		resultWriter:     shared.NewDefaultResultWriter(config.Logger, config.Alerter),
	}
}

func (c *ProvisionDestroyHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// read the project and infra from the attached scope
	infra, _ := r.Context().Value(types.InfraScope).(*models.Infra)

	req := &ptypes.DeleteBaseRequest{}

	if ok := c.decoderValidator.DecodeAndValidate(w, r, req); !ok {
		return
	}

	// get the values from the previous operation to re-use
	lastOp, err := c.Config.Repo.Infra().GetLatestOperation(infra)
	if err != nil {
		apierrors.HandleAPIError(c.Config.Logger, c.Config.Alerter, w, r, apierrors.NewErrInternal(err), true)
		return
	}

	// create a new operation and write it to the database
	operationUID, err := models.GetOperationID()
	if err != nil {
		apierrors.HandleAPIError(c.Config.Logger, c.Config.Alerter, w, r, apierrors.NewErrInternal(err), true)
		return
	}

	operation := &models.Operation{
		UID:             operationUID,
		InfraID:         infra.ID,
		Type:            req.OperationKind,
		Status:          "starting",
		LastApplied:     lastOp.LastApplied,
		TemplateVersion: "v0.1.0",
	}

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

	// marshal the last applied values into a map[string]interface{}
	lastApplied := make(map[string]interface{})

	err = json.Unmarshal(lastOp.LastApplied, &lastApplied)

	if err != nil {
		apierrors.HandleAPIError(c.Config.Logger, c.Config.Alerter, w, r, apierrors.NewErrInternal(err), true)
		return
	}

	// spawn a new provisioning process
	err = c.Config.Provisioner.Provision(&provisioner.ProvisionOpts{
		Infra:         infra,
		Operation:     operation,
		OperationKind: provisioner.Destroy,
		Kind:          string(infra.Kind),
		Values:        lastApplied,
		CredentialExchange: &provisioner.ProvisionCredentialExchange{
			CredExchangeEndpoint: fmt.Sprintf(
				"%s/api/v1/%s/credentials",
				c.Config.ProvisionerConf.ProvisionerCredExchangeURL,
				models.GetWorkspaceID(infra, operation),
			),
			CredExchangeToken: rawToken,
			CredExchangeID:    ceToken.ID,
		},
	})

	if err != nil {
		apierrors.HandleAPIError(c.Config.Logger, c.Config.Alerter, w, r, apierrors.NewErrInternal(err), true)
		return
	}

	op, err := operation.ToOperationType()
	if err != nil {
		apierrors.HandleAPIError(c.Config.Logger, c.Config.Alerter, w, r, apierrors.NewErrInternal(err), true)
		return
	}

	infra.Status = types.InfraStatus("deleting")

	infra, err = c.Config.Repo.Infra().UpdateInfra(infra)

	if err != nil {
		apierrors.HandleAPIError(c.Config.Logger, c.Config.Alerter, w, r, apierrors.NewErrInternal(err), true)
		return
	}

	// return the operation response type to the server
	c.resultWriter.WriteResult(w, r, op)
}
