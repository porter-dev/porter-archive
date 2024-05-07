package project

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

// GetProjectReferralDetailsHandler is a handler for getting a project's referral code
type GetProjectReferralDetailsHandler struct {
	handlers.PorterHandlerWriter
}

// NewGetProjectReferralDetailsHandler returns an instance of GetProjectReferralDetailsHandler
func NewGetProjectReferralDetailsHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *GetProjectReferralDetailsHandler {
	return &GetProjectReferralDetailsHandler{
		PorterHandlerWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
	}
}

func (c *GetProjectReferralDetailsHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-get-project-referral-details")
	defer span.End()

	proj, _ := ctx.Value(types.ProjectScope).(*models.Project)

	if !c.Config().BillingManager.LagoConfigLoaded || !proj.GetFeatureFlag(models.MetronomeEnabled, c.Config().LaunchDarklyClient) || !proj.EnableSandbox {
		c.WriteResult(w, r, "")

		telemetry.WithAttributes(span,
			telemetry.AttributeKV{Key: "metronome-config-exists", Value: c.Config().BillingManager.LagoConfigLoaded},
			telemetry.AttributeKV{Key: "metronome-enabled", Value: proj.GetFeatureFlag(models.MetronomeEnabled, c.Config().LaunchDarklyClient)},
		)
		return
	}

	if proj.ReferralCode == "" {
		telemetry.WithAttributes(span,
			telemetry.AttributeKV{Key: "referral-code-exists", Value: false},
		)

		// Generate referral code for project if not present
		proj.ReferralCode = models.NewReferralCode()
		_, err := c.Repo().Project().UpdateProject(proj)
		if err != nil {
			err := telemetry.Error(ctx, span, err, "error updating project")
			c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}
	}

	referralCount, err := c.Repo().Referral().CountReferralsByProjectID(proj.ID, models.ReferralStatusCompleted)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error listing referrals by project id")
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	referralCodeResponse := struct {
		Code              string `json:"code"`
		ReferralCount     int64  `json:"referral_count"`
		MaxAllowedRewards int64  `json:"max_allowed_referrals"`
	}{
		Code:              proj.ReferralCode,
		ReferralCount:     referralCount,
		MaxAllowedRewards: c.Config().BillingManager.LagoClient.MaxReferralRewards,
	}

	c.WriteResult(w, r, referralCodeResponse)
}
