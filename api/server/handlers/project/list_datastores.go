package project

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/handlers/cloud_provider"
	"github.com/porter-dev/porter/api/server/handlers/datastore"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/telemetry"
)

// ListAllDatastoresForProjectHandler is a struct for listing all datastores for a given project
type ListAllDatastoresForProjectHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

// NewListAllDatastoresForProjectHandler constructs a datastore ListAllDatastoresForProjectHandler
func NewListAllDatastoresForProjectHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *ListAllDatastoresForProjectHandler {
	return &ListAllDatastoresForProjectHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

// ServeHTTP returns a list of datastores associated with the specified project
func (h *ListAllDatastoresForProjectHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-list-all-datastores-for-project")
	defer span.End()

	project, _ := ctx.Value(types.ProjectScope).(*models.Project)

	cloudProviders, err := cloud_provider.AwsAccounts(ctx, cloud_provider.AwsAccountsInput{
		ProjectID:                    project.ID,
		AWSAssumeRoleChainRepository: h.Repo().AWSAssumeRoleChainer(),
	})
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error getting cloud providers")
		h.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "num-cloud-providers", Value: len(cloudProviders)})

	allDatastores := []datastore.Datastore{}

	for _, cloudProvider := range cloudProviders {
		datastoresForCloudProvider, err := datastore.Datastores(ctx, datastore.DatastoresInput{
			ProjectID:       project.ID,
			CloudProvider:   cloudProvider,
			IncludeMetadata: true,
			CCPClient:       h.Config().ClusterControlPlaneClient,
		})
		if err != nil {
			telemetry.WithAttributes(span,
				telemetry.AttributeKV{Key: "cloud-provider-id", Value: cloudProvider.AccountID},
				telemetry.AttributeKV{Key: "cloud-provider-type", Value: int(cloudProvider.Type)},
			)
			err := telemetry.Error(ctx, span, err, "error getting datastores")
			h.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
			return
		}
		allDatastores = append(allDatastores, datastoresForCloudProvider...)
	}

	response := datastore.ListDatastoresResponse{
		Datastores: allDatastores,
	}

	h.WriteResult(w, r, response)
}
