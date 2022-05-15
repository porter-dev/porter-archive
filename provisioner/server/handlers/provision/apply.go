package provision

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/analytics"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/random"
	"github.com/porter-dev/porter/provisioner/integrations/provisioner"
	"github.com/porter-dev/porter/provisioner/integrations/redis_stream"
	"github.com/porter-dev/porter/provisioner/server/config"
	"golang.org/x/crypto/bcrypt"

	ptypes "github.com/porter-dev/porter/provisioner/types"
)

type ProvisionApplyHandler struct {
	Config *config.Config

	decoderValidator shared.RequestDecoderValidator
	resultWriter     shared.ResultWriter
}

func NewProvisionApplyHandler(
	config *config.Config,
) *ProvisionApplyHandler {
	return &ProvisionApplyHandler{
		Config:           config,
		decoderValidator: shared.NewDefaultRequestDecoderValidator(config.Logger, config.Alerter),
		resultWriter:     shared.NewDefaultResultWriter(config.Logger, config.Alerter),
	}
}

func (c *ProvisionApplyHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// read the project and infra from the attached scope
	infra, _ := r.Context().Value(types.InfraScope).(*models.Infra)

	req := &ptypes.ApplyBaseRequest{}

	if ok := c.decoderValidator.DecodeAndValidate(w, r, req); !ok {
		return
	}

	// create a new operation and write it to the database
	operationUID, err := models.GetOperationID()

	if err != nil {
		apierrors.HandleAPIError(c.Config.Logger, c.Config.Alerter, w, r, apierrors.NewErrInternal(err), true)
		return
	}

	// parse values to JSON to store in the operation
	valuesJSON, err := json.Marshal(req.Values)

	if err != nil {
		apierrors.HandleAPIError(c.Config.Logger, c.Config.Alerter, w, r, apierrors.NewErrInternal(err), true)
		return
	}

	operation := &models.Operation{
		UID:             operationUID,
		InfraID:         infra.ID,
		Type:            req.OperationKind,
		Status:          "starting",
		LastApplied:     valuesJSON,
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

	// push a first message to the operation stream
	err = redis_stream.PushToOperationStream(c.Config.RedisClient, infra, operation, &ptypes.TFResourceState{
		Status: "OPERATION_STARTED",
	})

	if err != nil {
		apierrors.HandleAPIError(c.Config.Logger, c.Config.Alerter, w, r, apierrors.NewErrInternal(err), true)
		return
	}

	// spawn a new provisioning process
	err = c.Config.Provisioner.Provision(&provisioner.ProvisionOpts{
		Infra:         infra,
		Operation:     operation,
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
	})

	if err != nil {
		apierrors.HandleAPIError(c.Config.Logger, c.Config.Alerter, w, r, apierrors.NewErrInternal(err), true)
		return
	}

	// update the infrastructure as either "updating" or "creating"
	if req.OperationKind == "create" || req.OperationKind == "retry_create" {
		infra.Status = types.InfraStatus("creating")
	} else if req.OperationKind == "update" {
		infra.Status = types.InfraStatus("updating")
	}

	infra, err = c.Config.Repo.Infra().UpdateInfra(infra)

	if err != nil {
		apierrors.HandleAPIError(c.Config.Logger, c.Config.Alerter, w, r, apierrors.NewErrInternal(err), true)
		return
	}

	op, err := operation.ToOperationType()

	if err != nil {
		apierrors.HandleAPIError(c.Config.Logger, c.Config.Alerter, w, r, apierrors.NewErrInternal(err), true)
		return
	}

	// return the operation response type to the server
	c.resultWriter.WriteResult(w, r, op)

	// if this is a cluster or registry infra type, send to analytics client
	switch infra.Kind {
	case types.InfraDOKS, types.InfraEKS, types.InfraGKE, types.InfraAKS:
		c.Config.AnalyticsClient.Track(analytics.ClusterProvisioningStartTrack(
			&analytics.ClusterProvisioningStartTrackOpts{
				ProjectScopedTrackOpts: analytics.GetProjectScopedTrackOpts(0, infra.ProjectID),
				ClusterType:            infra.Kind,
				InfraID:                infra.ID,
			},
		))
	case types.InfraDOCR, types.InfraECR, types.InfraGCR, types.InfraACR:
		c.Config.AnalyticsClient.Track(analytics.RegistryProvisioningStartTrack(
			&analytics.RegistryProvisioningStartTrackOpts{
				ProjectScopedTrackOpts: analytics.GetProjectScopedTrackOpts(0, infra.ProjectID),
				RegistryType:           infra.Kind,
				InfraID:                infra.ID,
			},
		))
	}
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
		ProjectID:         infra.ProjectID,
		Expiry:            &expiry,
		Token:             hashedToken,
		DOCredentialID:    infra.DOIntegrationID,
		AWSCredentialID:   infra.AWSIntegrationID,
		GCPCredentialID:   infra.GCPIntegrationID,
		AzureCredentialID: infra.AzureIntegrationID,
	}

	// handle write to the database
	ceToken, err = conf.Repo.CredentialsExchangeToken().CreateCredentialsExchangeToken(ceToken)

	if err != nil {
		return nil, "", err
	}

	return ceToken, rawToken, nil
}
