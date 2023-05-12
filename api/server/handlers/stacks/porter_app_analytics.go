package stacks

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/analytics"
	"github.com/porter-dev/porter/internal/models"
)

type PorterAppAnalyticsHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewPorterAppAnalyticsHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *PorterAppAnalyticsHandler {
	return &PorterAppAnalyticsHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (v *PorterAppAnalyticsHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	user, _ := ctx.Value(types.UserScope).(*models.User)
	project, _ := ctx.Value(types.ProjectScope).(*models.Project)

	request := &types.PorterAppAnalyticsRequest{}
	if ok := v.DecodeAndValidate(w, r, request); !ok {
		return
	}

	if request.Step == "stack-launch-start" {
		v.Config().AnalyticsClient.Track(analytics.StackLaunchStartTrack(&analytics.StackLaunchStartOpts{
			ProjectScopedTrackOpts: analytics.GetProjectScopedTrackOpts(user.ID, project.ID),
		}))
	}

	if request.Step == "stack-launch-complete" {
		v.Config().AnalyticsClient.Track(analytics.StackLaunchCompleteTrack(&analytics.StackLaunchCompleteOpts{
			ProjectScopedTrackOpts: analytics.GetProjectScopedTrackOpts(user.ID, project.ID),
			StackName:              request.StackName,
		}))
	}

	if request.Step == "stack-launch-success" {
		v.Config().AnalyticsClient.Track(analytics.StackLaunchSuccessTrack(&analytics.StackLaunchSuccessOpts{
			ProjectScopedTrackOpts: analytics.GetProjectScopedTrackOpts(user.ID, project.ID),
			StackName:              request.StackName,
		}))
	}

	v.WriteResult(w, r, user.ToUserType())
}
