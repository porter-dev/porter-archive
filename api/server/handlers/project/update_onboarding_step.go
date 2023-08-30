package project

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/analytics"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/telemetry"
)

type UpdateOnboardingStepHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewUpdateOnboardingStepHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *UpdateOnboardingStepHandler {
	return &UpdateOnboardingStepHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (v *UpdateOnboardingStepHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-update-onboarding-step")
	defer span.End()

	user, _ := ctx.Value(types.UserScope).(*models.User)
	project, _ := ctx.Value(types.ProjectScope).(*models.Project)

	request := &types.UpdateOnboardingStepRequest{}

	// intentionally do not return error so as not to block post-reporting steps
	if ok := v.DecodeAndValidate(w, r, request); !ok {
		_ = telemetry.Error(ctx, span, nil, "error decoding request")
	}

	if request.Step == "project-delete" {
		err := v.Config().AnalyticsClient.Track(analytics.ProjectDeleteTrack(&analytics.ProjectCreateDeleteTrackOpts{
			ProjectScopedTrackOpts: analytics.GetProjectScopedTrackOpts(user.ID, project.ID),
			Email:                  user.Email,
			FirstName:              user.FirstName,
			LastName:               user.LastName,
			CompanyName:            user.CompanyName,
		}))
		if err != nil {
			_ = telemetry.Error(ctx, span, err, "error tracking project delete")
		}
	}

	if request.Step == "cluster-delete" {
		err := v.Config().AnalyticsClient.Track(analytics.ClusterDeleteTrack(&analytics.ClusterDeleteTrackOpts{
			ProjectScopedTrackOpts: analytics.GetProjectScopedTrackOpts(user.ID, project.ID),
			Email:                  user.Email,
			FirstName:              user.FirstName,
			LastName:               user.LastName,
			CompanyName:            user.CompanyName,
		}))
		if err != nil {
			_ = telemetry.Error(ctx, span, err, "error tracking cluster delete")
		}
	}

	if request.Step == "cost-consent-opened" {
		err := v.Config().AnalyticsClient.Track(analytics.CostConsentOpenedTrack(&analytics.CostConsentOpenedTrackOpts{
			UserScopedTrackOpts: analytics.GetUserScopedTrackOpts(user.ID),
			Provider:            request.Provider,
			Email:               user.Email,
			FirstName:           user.FirstName,
			LastName:            user.LastName,
			CompanyName:         user.CompanyName,
		}))
		if err != nil {
			_ = telemetry.Error(ctx, span, err, "error tracking cost consent opened")
		}
	}

	if request.Step == "cost-consent-complete" {
		err := v.Config().AnalyticsClient.Track(analytics.CostConsentCompletedTrack(&analytics.CostConsentCompletedTrackOpts{
			UserScopedTrackOpts: analytics.GetUserScopedTrackOpts(user.ID),
			Provider:            request.Provider,
			Email:               user.Email,
			FirstName:           user.FirstName,
			LastName:            user.LastName,
			CompanyName:         user.CompanyName,
		}))
		if err != nil {
			_ = telemetry.Error(ctx, span, err, "error tracking cost consent completed")
		}
	}

	if request.Step == "aws-account-id-complete" {
		err := v.Config().AnalyticsClient.Track(analytics.AWSInputTrack(&analytics.AWSInputTrackOpts{
			ProjectScopedTrackOpts: analytics.GetProjectScopedTrackOpts(user.ID, project.ID),
			Email:                  user.Email,
			FirstName:              user.FirstName,
			LastName:               user.LastName,
			CompanyName:            user.CompanyName,
			AccountId:              request.AccountId,
		}))
		if err != nil {
			_ = telemetry.Error(ctx, span, err, "error tracking aws input")
		}
	}

	if request.Step == "aws-login-redirect-success" {
		err := v.Config().AnalyticsClient.Track(analytics.AWSLoginRedirectSuccess(&analytics.AWSRedirectOpts{
			ProjectScopedTrackOpts: analytics.GetProjectScopedTrackOpts(user.ID, project.ID),
			Email:                  user.Email,
			FirstName:              user.FirstName,
			LastName:               user.LastName,
			CompanyName:            user.CompanyName,
			AccountId:              request.AccountId,
			LoginURL:               request.LoginURL,
		}))
		if err != nil {
			_ = telemetry.Error(ctx, span, err, "error tracking aws login redirect")
		}
	}

	if request.Step == "aws-cloudformation-redirect-success" {
		err := v.Config().AnalyticsClient.Track(analytics.AWSCloudformationRedirectSuccess(&analytics.AWSRedirectOpts{
			ProjectScopedTrackOpts: analytics.GetProjectScopedTrackOpts(user.ID, project.ID),
			Email:                  user.Email,
			FirstName:              user.FirstName,
			LastName:               user.LastName,
			CompanyName:            user.CompanyName,
			AccountId:              request.AccountId,
			CloudformationURL:      request.CloudformationURL,
			ExternalId:             request.ExternalId,
		}))
		if err != nil {
			_ = telemetry.Error(ctx, span, err, "error tracking aws cloudformation redirect")
		}
	}

	if request.Step == "aws-create-integration-success" {
		err := v.Config().AnalyticsClient.Track(analytics.AWSCreateIntegrationSucceeded(&analytics.AWSCreateIntegrationOpts{
			ProjectScopedTrackOpts: analytics.GetProjectScopedTrackOpts(user.ID, project.ID),
			Email:                  user.Email,
			FirstName:              user.FirstName,
			LastName:               user.LastName,
			CompanyName:            user.CompanyName,
			AccountId:              request.AccountId,
		}))
		if err != nil {
			_ = telemetry.Error(ctx, span, err, "error tracking aws create integration")
		}
	}

	if request.Step == "aws-create-integration-failure" {
		err := v.Config().AnalyticsClient.Track(analytics.AWSCreateIntegrationFailed(&analytics.AWSCreateIntegrationOpts{
			ProjectScopedTrackOpts: analytics.GetProjectScopedTrackOpts(user.ID, project.ID),
			Email:                  user.Email,
			FirstName:              user.FirstName,
			LastName:               user.LastName,
			CompanyName:            user.CompanyName,
			AccountId:              request.AccountId,
			ErrorMessage:           request.ErrorMessage,
			ExternalId:             request.ExternalId,
		}))
		if err != nil {
			_ = telemetry.Error(ctx, span, err, "error tracking aws create integration failure")
		}
	}

	if request.Step == "credential-step-complete" {
		err := v.Config().AnalyticsClient.Track(analytics.CredentialStepTrack(&analytics.CredentialStepTrackOpts{
			UserScopedTrackOpts: analytics.GetUserScopedTrackOpts(user.ID),
		}))
		if err != nil {
			_ = telemetry.Error(ctx, span, err, "error tracking credential step complete")
		}
	}

	if request.Step == "pre-provisioning-check-started" {
		err := v.Config().AnalyticsClient.Track(analytics.PreProvisionCheckTrack(&analytics.PreProvisionCheckTrackOpts{
			ProjectScopedTrackOpts: analytics.GetProjectScopedTrackOpts(user.ID, project.ID),
			Email:                  user.Email,
			FirstName:              user.FirstName,
			LastName:               user.LastName,
			CompanyName:            user.CompanyName,
		}))
		if err != nil {
			_ = telemetry.Error(ctx, span, err, "error tracking pre-provisioning check started")
		}
	}

	if request.Step == "provisioning-started" {
		err := v.Config().AnalyticsClient.Track(analytics.ProvisioningAttemptTrack(&analytics.ProvisioningAttemptTrackOpts{
			ProjectScopedTrackOpts: analytics.GetProjectScopedTrackOpts(user.ID, project.ID),
			Email:                  user.Email,
			FirstName:              user.FirstName,
			LastName:               user.LastName,
			CompanyName:            user.CompanyName,
			Region:                 request.Region,
		}))
		if err != nil {
			_ = telemetry.Error(ctx, span, err, "error tracking provisioning started")
		}
	}

	if request.Step == "provisioning-failed" {
		err := v.Config().AnalyticsClient.Track(analytics.ProvisionFailureTrack(&analytics.ProvisioningAttemptTrackOpts{
			ProjectScopedTrackOpts: analytics.GetProjectScopedTrackOpts(user.ID, project.ID),
			Email:                  user.Email,
			FirstName:              user.FirstName,
			LastName:               user.LastName,
			CompanyName:            user.CompanyName,
			ErrorMessage:           request.ErrorMessage,
			Region:                 request.Region,
		}))
		if err != nil {
			_ = telemetry.Error(ctx, span, err, "error tracking provisioning failure")
		}
	}

	v.WriteResult(w, r, user.ToUserType())
}
