package porter_app

import (
	"context"
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/analytics"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/telemetry"
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

	validateApplyV2 := project.GetFeatureFlag(models.ValidateApplyV2, v.Config().LaunchDarklyClient)
	if request.Step == "stack-launch-start" {
		v.Config().AnalyticsClient.Track(analytics.StackLaunchStartTrack(&analytics.StackLaunchStartOpts{
			ProjectScopedTrackOpts: analytics.GetProjectScopedTrackOpts(user.ID, project.ID),
			Email:                  user.Email,
			FirstName:              user.FirstName,
			LastName:               user.LastName,
			CompanyName:            user.CompanyName,
			ValidateApplyV2:        validateApplyV2,
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
			ValidateApplyV2:        validateApplyV2,
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
			ValidateApplyV2:        validateApplyV2,
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
			ValidateApplyV2:        validateApplyV2,
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
			ValidateApplyV2:        validateApplyV2,
		}))
	}

	if request.Step == "porter-app-update-failure" {
		v.Config().AnalyticsClient.Track(analytics.PorterAppUpdateFailureTrack(&analytics.PorterAppUpdateOpts{
			ProjectScopedTrackOpts: analytics.GetProjectScopedTrackOpts(user.ID, project.ID),
			StackName:              request.StackName,
			Email:                  user.Email,
			FirstName:              user.FirstName,
			LastName:               user.LastName,
			CompanyName:            user.CompanyName,
			ErrorMessage:           request.ErrorMessage,
			ErrorStackTrace:        request.ErrorStackTrace,
			ValidateApplyV2:        validateApplyV2,
		}))
	}

	v.WriteResult(w, r, user.ToUserType())
}

func TrackStackBuildStatus(
	ctx context.Context,
	config *config.Config,
	user *models.User,
	project *models.Project,
	stackName string,
	errorMessage string,
	status types.PorterAppEventStatus,
	validateApplyV2 bool,
	b64BuildLogs string,
) error {
	_, span := telemetry.NewSpan(ctx, "track-build-status")
	defer span.End()

	telemetry.WithAttributes(
		span,
		telemetry.AttributeKV{Key: "porter-app-build-status", Value: string(status)},
		telemetry.AttributeKV{Key: "porter-app-name", Value: stackName},
		telemetry.AttributeKV{Key: "porter-app-error-message", Value: errorMessage},
	)

	if status == types.PorterAppEventStatus_Progressing {
		err := config.AnalyticsClient.Track(analytics.StackBuildProgressingTrack(&analytics.StackBuildOpts{
			ProjectScopedTrackOpts: analytics.GetProjectScopedTrackOpts(user.ID, project.ID),
			StackName:              stackName,
			Email:                  user.Email,
			FirstName:              user.FirstName,
			LastName:               user.LastName,
			CompanyName:            user.CompanyName,
			ValidateApplyV2:        validateApplyV2,
		}))
		if err != nil {
			return telemetry.Error(ctx, span, err, "Failed to track stack build progressing")
		}
	}

	if status == types.PorterAppEventStatus_Success {
		err := config.AnalyticsClient.Track(analytics.StackBuildSuccessTrack(&analytics.StackBuildOpts{
			ProjectScopedTrackOpts: analytics.GetProjectScopedTrackOpts(user.ID, project.ID),
			StackName:              stackName,
			Email:                  user.Email,
			FirstName:              user.FirstName,
			LastName:               user.LastName,
			CompanyName:            user.CompanyName,
			ValidateApplyV2:        validateApplyV2,
		}))
		if err != nil {
			return telemetry.Error(ctx, span, err, "Failed to track stack build success")
		}
	}

	if status == types.PorterAppEventStatus_Failed {
		er := config.AnalyticsClient.Track(analytics.StackBuildFailureTrack(&analytics.StackBuildOpts{
			ProjectScopedTrackOpts: analytics.GetProjectScopedTrackOpts(user.ID, project.ID),
			StackName:              stackName,
			ErrorMessage:           errorMessage,
			B64BuildLogs:           b64BuildLogs,
			Email:                  user.Email,
			FirstName:              user.FirstName,
			LastName:               user.LastName,
			CompanyName:            user.CompanyName,
			ValidateApplyV2:        validateApplyV2,
		}))
		if er != nil {
			return telemetry.Error(ctx, span, er, "Failed to track stack build failure")
		}
	}

	return nil
}
