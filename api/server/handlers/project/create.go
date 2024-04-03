package project

import (
	"net/http"

	"github.com/google/uuid"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/analytics"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"github.com/porter-dev/porter/internal/telemetry"
)

type ProjectCreateHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewProjectCreateHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *ProjectCreateHandler {
	return &ProjectCreateHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (p *ProjectCreateHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-create-project")
	defer span.End()

	request := &types.CreateProjectRequest{}

	if ok := p.DecodeAndValidate(w, r, request); !ok {
		err := telemetry.Error(ctx, span, nil, "error decoding create project request")
		p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	// read the user from context
	user, _ := r.Context().Value(types.UserScope).(*models.User)

	proj := &models.Project{
		Name:                   request.Name,
		CapiProvisionerEnabled: true,
		SimplifiedViewEnabled:  true,
		HelmValuesEnabled:      false,
		MultiCluster:           false,
		EnableReprovision:      false,
		EnableSandbox:          p.Config().ServerConf.EnableSandbox,
	}

	var err error

	proj, _, err = CreateProjectWithUser(p.Repo().Project(), proj, user)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error creating project with user")
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	step := types.StepConnectSource

	if p.Config().ServerConf.EnableSandbox {
		step = types.StepCleanUp
	}

	// create onboarding flow set to the first step. Read in env var
	_, err = p.Repo().Onboarding().CreateProjectOnboarding(&models.Onboarding{
		ProjectID:   proj.ID,
		CurrentStep: step,
	})
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error creating project onboarding")
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	// Create Stripe Customer
	if p.Config().ServerConf.StripeSecretKey != "" && p.Config().ServerConf.StripePublishableKey != "" {
		// Create billing customer for project and set the billing ID
		billingID, err := p.Config().BillingManager.StripeClient.CreateCustomer(ctx, user.Email, proj)
		if err != nil {
			err = telemetry.Error(ctx, span, err, "error creating billing customer")
			p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}
		proj.BillingID = billingID

		telemetry.WithAttributes(span,
			telemetry.AttributeKV{Key: "project-id", Value: proj.ID},
			telemetry.AttributeKV{Key: "customer-id", Value: proj.BillingID},
			telemetry.AttributeKV{Key: "user-email", Value: user.Email},
		)
	}

	// Create Metronome customer and add to starter plan
	if p.Config().ServerConf.MetronomeAPIKey != "" && p.Config().ServerConf.PorterCloudPlanID != "" &&
		p.Config().ServerConf.EnableSandbox {
		// Create Metronome Customer
		if p.Config().ServerConf.MetronomeAPIKey != "" {
			usageID, err := p.Config().BillingManager.MetronomeClient.CreateCustomer(user.CompanyName, proj.Name, proj.ID, proj.BillingID)
			if err != nil {
				err = telemetry.Error(ctx, span, err, "error creating billing customer")
				p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
				return
			}
			proj.UsageID = usageID
		}

		porterCloudPlanID, err := uuid.Parse(p.Config().ServerConf.PorterCloudPlanID)
		if err != nil {
			err = telemetry.Error(ctx, span, err, "error parsing starter plan id")
			p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}

		// Add to starter plan
		customerPlanID, err := p.Config().BillingManager.MetronomeClient.AddCustomerPlan(proj.UsageID, porterCloudPlanID)
		if err != nil {
			err = telemetry.Error(ctx, span, err, "error adding customer to starter plan")
			p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}
		proj.UsagePlanID = customerPlanID
	}

	_, err = p.Repo().Project().UpdateProject(proj)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error updating project")
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	// create default project usage restriction
	_, err = p.Repo().ProjectUsage().CreateProjectUsage(&models.ProjectUsage{
		ProjectID:      proj.ID,
		ResourceCPU:    types.BasicPlan.ResourceCPU,
		ResourceMemory: types.BasicPlan.ResourceMemory,
		Clusters:       types.BasicPlan.Clusters,
		Users:          types.BasicPlan.Users,
	})
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error creating project usage")
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	p.WriteResult(w, r, proj.ToProjectType(p.Config().LaunchDarklyClient))

	p.Config().AnalyticsClient.Track(analytics.ProjectCreateTrack(&analytics.ProjectCreateDeleteTrackOpts{
		ProjectScopedTrackOpts: analytics.GetProjectScopedTrackOpts(user.ID, proj.ID),
	}))
}

func CreateProjectWithUser(
	projectRepo repository.ProjectRepository,
	proj *models.Project,
	user *models.User,
) (*models.Project, *models.Role, error) {
	proj, err := projectRepo.CreateProject(proj)
	if err != nil {
		return nil, nil, err
	}

	// create a new Role with the user as the admin
	role, err := projectRepo.CreateProjectRole(proj, &models.Role{
		Role: types.Role{
			UserID:    user.ID,
			ProjectID: proj.ID,
			Kind:      types.RoleAdmin,
		},
	})
	if err != nil {
		return nil, nil, err
	}

	// read the project again to get the model with the role attached
	proj, err = projectRepo.ReadProject(proj.ID)
	if err != nil {
		return nil, nil, err
	}

	return proj, role, nil
}
