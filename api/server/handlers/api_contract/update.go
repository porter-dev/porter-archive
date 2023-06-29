package api_contract

import (
	"encoding/base64"
	"net/http"

	"github.com/bufbuild/connect-go"
	"github.com/google/uuid"
	helpers "github.com/porter-dev/api-contracts/generated/go/helpers"
	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/telemetry"
)

type APIContractUpdateHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewAPIContractUpdateHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *APIContractUpdateHandler {
	return &APIContractUpdateHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

// ServeHTTP parses the Porter API contract for validity, and forwards the requests for handling on to another service
// For now, this handling cluster creation only, by inserting a row into the cluster table in order to create an ID for this cluster, as well as stores the raw request JSON for updating later
func (c *APIContractUpdateHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-update-api-contract")
	defer span.End()

	project, _ := ctx.Value(types.ProjectScope).(*models.Project)
	user, _ := ctx.Value(types.UserScope).(*models.User)

	var apiContract porterv1.Contract

	err := helpers.UnmarshalContractObjectFromReader(r.Body, &apiContract)
	if err != nil {
		e := telemetry.Error(ctx, span, err, "error parsing api contract")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(e, http.StatusBadRequest))
		return
	}

	if !project.CapiProvisionerEnabled && !c.Config().EnableCAPIProvisioner {
		// return dummy data if capi provisioner disabled in project settings, and as env var
		// TODO: remove this stub when we can spin up all services locally, easily
		clusterID := apiContract.Cluster.ClusterId
		if apiContract.Cluster.ClusterId == 0 {
			dbcli := models.Cluster{
				ProjectID:                         uint(apiContract.Cluster.ProjectId),
				Status:                            "UPDATING_UNAVAILABLE",
				ProvisionedBy:                     "CAPI",
				CloudProvider:                     "AWS",
				CloudProviderCredentialIdentifier: apiContract.Cluster.CloudProviderCredentialsId,
				Name:                              apiContract.Cluster.GetEksKind().ClusterName,
				VanityName:                        apiContract.Cluster.GetEksKind().ClusterName,
			}
			dbcl, err := c.Config().Repo.Cluster().CreateCluster(&dbcli)
			if err != nil {
				e := telemetry.Error(ctx, span, err, "error updating mocking contract")
				c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(e, http.StatusInternalServerError))
				return
			}
			clusterID = int32(dbcl.ID)
		}

		by, err := helpers.MarshalContractObject(ctx, &apiContract)
		if err != nil {
			e := telemetry.Error(ctx, span, err, "error marshalling mock api contract")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(e, http.StatusInternalServerError))
			return
		}
		b64Contract := base64.StdEncoding.EncodeToString([]byte(by))

		revisionInput := models.APIContractRevision{
			ID:             uuid.New(),
			ClusterID:      int(clusterID),
			ProjectID:      int(apiContract.Cluster.ProjectId),
			Base64Contract: b64Contract,
		}
		revision, err := c.Config().Repo.APIContractRevisioner().Insert(ctx, revisionInput)
		if err != nil {
			e := telemetry.Error(ctx, span, err, "error updating mock api contract")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(e, http.StatusInternalServerError))
			return
		}
		resp := &porterv1.ContractRevision{
			ClusterId:  int32(clusterID),
			ProjectId:  apiContract.Cluster.ProjectId,
			RevisionId: revision.ID.String(),
		}
		w.WriteHeader(http.StatusCreated)
		c.WriteResult(w, r, resp)
		return
	}

	apiContract.User = &porterv1.User{
		Id: int32(user.ID),
	}
	updateRequest := connect.NewRequest(&porterv1.UpdateContractRequest{
		Contract: &apiContract,
	})
	revision, err := c.Config().ClusterControlPlaneClient.UpdateContract(ctx, updateRequest)
	if err != nil {
		e := telemetry.Error(ctx, span, err, "error sending contract for update")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(e, http.StatusInternalServerError))
		return
	}

	w.WriteHeader(http.StatusCreated)
	c.WriteResult(w, r, revision.Msg)
}
