package preview_environment

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/telemetry"
)

type CreatePreviewEnvironmentHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewCreatePreviewEnvironmentHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *CreatePreviewEnvironmentHandler {
	return &CreatePreviewEnvironmentHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (c *CreatePreviewEnvironmentHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-create-preview-env")
	defer span.End()

	project, _ := ctx.Value(types.ProjectScope).(*models.Project)
	cluster, _ := ctx.Value(types.ClusterScope).(*models.Cluster)

	request := &types.CreatePreviewEnvironmentRequest{}
	if ok := c.DecodeAndValidate(w, r, request); !ok {
		err := telemetry.Error(ctx, span, nil, "error decoding request")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "cluster-id", Value: cluster.ID},
		telemetry.AttributeKV{Key: "project-id", Value: project.ID},
		telemetry.AttributeKV{Key: "env-config-id", Value: request.EnvironmentConfigID},
		telemetry.AttributeKV{Key: "git-repo-owner", Value: request.GitRepoOwner},
		telemetry.AttributeKV{Key: "git-repo-name", Value: request.GitRepoName},
		telemetry.AttributeKV{Key: "branch", Value: request.Branch},
	)

	// create the preview environment
	previewEnv := &models.PreviewEnvironment{
		GitRepoOwner:        request.GitRepoOwner,
		GitRepoName:         request.GitRepoName,
		Branch:              request.Branch,
		EnvironmentConfigID: request.EnvironmentConfigID,
	}

	previewEnv, err := c.Repo().PreviewEnvironment().CreatePreviewEnvironment(previewEnv)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error creating preview environment")
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	c.WriteResult(w, r, previewEnv.ToPreviewEnvironmentType())
	return
}
