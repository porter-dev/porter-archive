package project

import (
	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/analytics"
	"github.com/porter-dev/porter/internal/models"
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

	p.WriteResult(w, r, resp.ClusterID)

	p.Config().AnalyticsClient.Track(analytics.ProjectConnectTrack(&analytics.ProjectCreateDeleteTrackOpts{
		ProjectScopedTrackOpts: analytics.GetProjectScopedTrackOpts(user.ID, proj.ID),
	}))
}
