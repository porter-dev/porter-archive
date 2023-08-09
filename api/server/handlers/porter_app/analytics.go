package porter_app

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
			Email:                  user.Email,
			FirstName:              user.FirstName,
			LastName:               user.LastName,
			CompanyName:            user.CompanyName,
		}))
	}

	if request.Step == "stack-launch-complete" {
		v.Config().AnalyticsClient.Track(analytics.StackLaunchCompleteTrack(&analytics.StackLaunchCompleteOpts{
			ProjectScopedTrackOpts: analytics.GetProjectScopedTrackOpts(user.ID, project.ID),
			StackName:              request.StackName,
			Email:                  user.Email,
			FirstName:              user.FirstName,
			LastName:               user.LastName,
			CompanyName:            user.CompanyName,
		}))
	}

	if request.Step == "stack-launch-success" {
		v.Config().AnalyticsClient.Track(analytics.StackLaunchSuccessTrack(&analytics.StackLaunchSuccessOpts{
			ProjectScopedTrackOpts: analytics.GetProjectScopedTrackOpts(user.ID, project.ID),
			StackName:              request.StackName,
			Email:                  user.Email,
			FirstName:              user.FirstName,
			LastName:               user.LastName,
			CompanyName:            user.CompanyName,
		}))
	}

	if request.Step == "stack-launch-failure" {
		v.Config().AnalyticsClient.Track(analytics.StackLaunchFailureTrack(&analytics.StackLaunchFailureOpts{
			ProjectScopedTrackOpts: analytics.GetProjectScopedTrackOpts(user.ID, project.ID),
			StackName:              request.StackName,
			Email:                  user.Email,
			FirstName:              user.FirstName,
			LastName:               user.LastName,
			CompanyName:            user.CompanyName,
			ErrorMessage:           request.ErrorMessage,
		}))
	}

	if request.Step == "stack-deletion" {
		v.Config().AnalyticsClient.Track(analytics.StackDeletionTrack(&analytics.StackDeletionOpts{
			ProjectScopedTrackOpts: analytics.GetProjectScopedTrackOpts(user.ID, project.ID),
			StackName:              request.StackName,
			Email:                  user.Email,
			FirstName:              user.FirstName,
			LastName:               user.LastName,
			CompanyName:            user.CompanyName,
			DeleteWorkflowFile:     request.DeleteWorkflowFile,
		}))
	}

	v.WriteResult(w, r, user.ToUserType())
}

func TrackStackBuildStatus(
	config *config.Config,
	user *models.User,
	project *models.Project,
	stackName string,
	errorMessage string,
	status types.PorterAppEventStatus,
) error {
	if status == types.PorterAppEventStatus_Progressing {
		return config.AnalyticsClient.Track(analytics.StackBuildProgressingTrack(&analytics.StackBuildOpts{
			ProjectScopedTrackOpts: analytics.GetProjectScopedTrackOpts(user.ID, project.ID),
			StackName:              stackName,
			Email:                  user.Email,
			FirstName:              user.FirstName,
			LastName:               user.LastName,
			CompanyName:            user.CompanyName,
		}))
	}

	if status == types.PorterAppEventStatus_Success {
		return config.AnalyticsClient.Track(analytics.StackBuildSuccessTrack(&analytics.StackBuildOpts{
			ProjectScopedTrackOpts: analytics.GetProjectScopedTrackOpts(user.ID, project.ID),
			StackName:              stackName,
			Email:                  user.Email,
			FirstName:              user.FirstName,
			LastName:               user.LastName,
			CompanyName:            user.CompanyName,
		}))
	}

	if status == types.PorterAppEventStatus_Failed {
		return config.AnalyticsClient.Track(analytics.StackBuildFailureTrack(&analytics.StackBuildOpts{
			ProjectScopedTrackOpts: analytics.GetProjectScopedTrackOpts(user.ID, project.ID),
			StackName:              stackName,
			ErrorMessage:           errorMessage,
			Email:                  user.Email,
			FirstName:              user.FirstName,
			LastName:               user.LastName,
			CompanyName:            user.CompanyName,
		}))
	}

	return nil
}
