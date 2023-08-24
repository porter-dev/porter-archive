package project

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/analytics"
	"github.com/porter-dev/porter/internal/models"
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
	user, _ := r.Context().Value(types.UserScope).(*models.User)
	project, _ := r.Context().Value(types.ProjectScope).(*models.Project)

	request := &types.UpdateOnboardingStepRequest{}
	if ok := v.DecodeAndValidate(w, r, request); !ok {
		return
	}

	if request.Step == "project-delete" {
		v.Config().AnalyticsClient.Track(analytics.ProjectDeleteTrack(&analytics.ProjectCreateDeleteTrackOpts{
			ProjectScopedTrackOpts: analytics.GetProjectScopedTrackOpts(user.ID, project.ID),
			Email:                  user.Email,
			FirstName:              user.FirstName,
			LastName:               user.LastName,
			CompanyName:            user.CompanyName,
		}))
	}

	if request.Step == "cost-consent-opened" {
		v.Config().AnalyticsClient.Track(analytics.CostConsentOpenedTrack(&analytics.CostConsentOpenedTrackOpts{
			UserScopedTrackOpts: analytics.GetUserScopedTrackOpts(user.ID),
			Provider:            request.Provider,
			Email:               user.Email,
			FirstName:           user.FirstName,
			LastName:            user.LastName,
			CompanyName:         user.CompanyName,
		}))
	}

	if request.Step == "cost-consent-complete" {
		v.Config().AnalyticsClient.Track(analytics.CostConsentCompletedTrack(&analytics.CostConsentCompletedTrackOpts{
			UserScopedTrackOpts: analytics.GetUserScopedTrackOpts(user.ID),
			Provider:            request.Provider,
			Email:               user.Email,
			FirstName:           user.FirstName,
			LastName:            user.LastName,
			CompanyName:         user.CompanyName,
		}))
	}

	if request.Step == "aws-account-id-complete" {
		v.Config().AnalyticsClient.Track(analytics.AWSInputTrack(&analytics.AWSInputTrackOpts{
			ProjectScopedTrackOpts: analytics.GetProjectScopedTrackOpts(user.ID, project.ID),
			Email:                  user.Email,
			FirstName:              user.FirstName,
			LastName:               user.LastName,
			CompanyName:            user.CompanyName,
			AccountId:              request.AccountId,
		}))
	}

	if request.Step == "aws-login-redirect-success" {
		v.Config().AnalyticsClient.Track(analytics.AWSLoginRedirectSuccess(&analytics.AWSRedirectOpts{
			ProjectScopedTrackOpts: analytics.GetProjectScopedTrackOpts(user.ID, project.ID),
			Email:                  user.Email,
			FirstName:              user.FirstName,
			LastName:               user.LastName,
			CompanyName:            user.CompanyName,
			AccountId:              request.AccountId,
			LoginURL:               request.LoginURL,
		}))
	}

	if request.Step == "aws-cloudformation-redirect-success" {
		v.Config().AnalyticsClient.Track(analytics.AWSCloudformationRedirectSuccess(&analytics.AWSRedirectOpts{
			ProjectScopedTrackOpts: analytics.GetProjectScopedTrackOpts(user.ID, project.ID),
			Email:                  user.Email,
			FirstName:              user.FirstName,
			LastName:               user.LastName,
			CompanyName:            user.CompanyName,
			AccountId:              request.AccountId,
			CloudformationURL:      request.CloudformationURL,
			ExternalId:             request.ExternalId,
		}))
	}

	if request.Step == "aws-create-integration-success" {
		v.Config().AnalyticsClient.Track(analytics.AWSCreateIntegrationSucceeded(&analytics.AWSCreateIntegrationOpts{
			ProjectScopedTrackOpts: analytics.GetProjectScopedTrackOpts(user.ID, project.ID),
			Email:                  user.Email,
			FirstName:              user.FirstName,
			LastName:               user.LastName,
			CompanyName:            user.CompanyName,
			AccountId:              request.AccountId,
		}))
	}

	if request.Step == "aws-create-integration-failure" {
		v.Config().AnalyticsClient.Track(analytics.AWSCreateIntegrationFailed(&analytics.AWSCreateIntegrationOpts{
			ProjectScopedTrackOpts: analytics.GetProjectScopedTrackOpts(user.ID, project.ID),
			Email:                  user.Email,
			FirstName:              user.FirstName,
			LastName:               user.LastName,
			CompanyName:            user.CompanyName,
			AccountId:              request.AccountId,
			ErrorMessage:           request.ErrorMessage,
			ExternalId:             request.ExternalId,
		}))
	}

	if request.Step == "credential-step-complete" {
		v.Config().AnalyticsClient.Track(analytics.CredentialStepTrack(&analytics.CredentialStepTrackOpts{
			UserScopedTrackOpts: analytics.GetUserScopedTrackOpts(user.ID),
		}))
	}

	if request.Step == "pre-provisioning-check-started" {
		v.Config().AnalyticsClient.Track(analytics.PreProvisionCheckTrack(&analytics.PreProvisionCheckTrackOpts{
			ProjectScopedTrackOpts: analytics.GetProjectScopedTrackOpts(user.ID, project.ID),
			Email:                  user.Email,
			FirstName:              user.FirstName,
			LastName:               user.LastName,
			CompanyName:            user.CompanyName,
		}))
	}

	if request.Step == "provisioning-started" {
		v.Config().AnalyticsClient.Track(analytics.ProvisioningAttemptTrack(&analytics.ProvisioningAttemptTrackOpts{
			ProjectScopedTrackOpts: analytics.GetProjectScopedTrackOpts(user.ID, project.ID),
			Email:                  user.Email,
			FirstName:              user.FirstName,
			LastName:               user.LastName,
			CompanyName:            user.CompanyName,
			Region:                 request.Region,
		}))
	}

	if request.Step == "provisioning-failed" {
		v.Config().AnalyticsClient.Track(analytics.ProvisionFailureTrack(&analytics.ProvisioningAttemptTrackOpts{
			ProjectScopedTrackOpts: analytics.GetProjectScopedTrackOpts(user.ID, project.ID),
			Email:                  user.Email,
			FirstName:              user.FirstName,
			LastName:               user.LastName,
			CompanyName:            user.CompanyName,
			ErrorMessage:           request.ErrorMessage,
			Region:                 request.Region,
		}))
	}

	v.WriteResult(w, r, user.ToUserType())
}
