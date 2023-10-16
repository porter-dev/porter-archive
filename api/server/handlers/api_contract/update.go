package api_contract

import (
	"net/http"

	"connectrpc.com/connect"

	helpers "github.com/porter-dev/api-contracts/generated/go/helpers"
	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/notifier"
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

	user, _ := ctx.Value(types.UserScope).(*models.User)
	proj, _ := ctx.Value(types.ProjectScope).(*models.Project)

	var apiContract porterv1.Contract

	err := helpers.UnmarshalContractObjectFromReader(r.Body, &apiContract)
	if err != nil {
		e := telemetry.Error(ctx, span, err, "error parsing api contract")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(e, http.StatusBadRequest))
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

	err = c.Config().UserNotifier.SendClusterCreationEmail(
		&notifier.SendClusterCreationEmailOpts{
			Email:   user.Email,
			Project: proj.Name,
			Name:    user.FirstName,
		},
	)
	if err != nil {
		e := telemetry.Error(ctx, span, err, "Error Sending Email upon cluster creation")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(e, http.StatusInternalServerError))
		return
	}

	w.WriteHeader(http.StatusCreated)
	c.WriteResult(w, r, revision.Msg)
}
