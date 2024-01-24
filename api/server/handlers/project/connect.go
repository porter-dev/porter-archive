package project

import (
	"connectrpc.com/connect"
	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/analytics"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/telemetry"
)

type ProjectConnectHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewProjectConnectHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *ProjectConnectHandler {
	return &ProjectConnectHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (p *ProjectConnectHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "connect-project-to-hosted")
	defer span.End()

	user, _ := r.Context().Value(types.UserScope).(*models.User)
	proj, _ := r.Context().Value(types.ProjectScope).(*models.Project)

	var err error
	resp, err := p.Config().ClusterControlPlaneClient.ConnectHostedProject(ctx, connect.NewRequest(&porterv1.ConnectHostedProjectRequest{
		ProjectId: int64(proj.ID),
	}))

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	if resp == nil || resp.Msg == nil {
		err = telemetry.Error(ctx, span, nil, "connect to hosted response is nil")
		p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	p.WriteResult(w, r, resp.Msg.ClusterId)

	p.Config().AnalyticsClient.Track(analytics.ProjectConnectTrack(&analytics.ProjectCreateDeleteTrackOpts{
		ProjectScopedTrackOpts: analytics.GetProjectScopedTrackOpts(user.ID, proj.ID),
	}))
}
