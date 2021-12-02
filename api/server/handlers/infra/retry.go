package infra

import (
	"fmt"
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/handlers/provision"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/kubernetes/provisioner"
	"github.com/porter-dev/porter/internal/kubernetes/provisioner/gcp/gke"
	"github.com/porter-dev/porter/internal/models"
	"gorm.io/gorm"
)

type InfraRetryHandler struct {
	handlers.PorterHandlerWriter
}

func NewInfraRetryHandler(config *config.Config, writer shared.ResultWriter) *InfraRetryHandler {
	return &InfraRetryHandler{
		PorterHandlerWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
	}
}

func (c *InfraRetryHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	infraModel, _ := r.Context().Value(types.InfraScope).(*models.Infra)
	infra := infraModel.ToInfraType()

	if infraModel.Status != types.StatusError {
		c.HandleAPIError(w, r, apierrors.NewErrForbidden(
			fmt.Errorf("only errored infras maybe retried")))
		return
	}

	gcpInt, err := c.Repo().GCPIntegration().ReadGCPIntegration(infra.ProjectID, infra.GCPIntegrationID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.HandleAPIError(w, r, apierrors.NewErrForbidden(err))
		} else {
			c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		}

		return
	}

	opts, err := provision.GetSharedProvisionerOpts(c.Config(), infraModel)
	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	vaultToken := ""

	if c.Config().CredentialBackend != nil {
		vaultToken, err = c.Config().CredentialBackend.CreateGCPToken(gcpInt)

		if err != nil {
			c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}
	}

	clusterName := infra.LastApplied["gke_name"]

	opts.CredentialExchange.VaultToken = vaultToken
	opts.GKE = &gke.Conf{
		GCPProjectID: gcpInt.GCPProjectID,
		GCPRegion:    gcpInt.GCPRegion,
		ClusterName:  clusterName,
	}

	opts.OperationKind = provisioner.Apply

	err = c.Config().ProvisionerAgent.Provision(opts)
	if err != nil {
		fmt.Println("updating status in error before response")
		infraModel.Status = types.StatusError
		infraModel, _ = c.Repo().Infra().UpdateInfra(infraModel)
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	infraModel.Status = types.StatusCreating
	infraModel, _ = c.Repo().Infra().UpdateInfra(infraModel)

	c.WriteResult(w, r, infraModel.ToInfraType())
}
