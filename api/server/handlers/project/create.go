package project

import (
	"context"
	"net/http"

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
		telemetry.Error(ctx, span, nil, "error decoding request") //nolint:errcheck
		return
	}
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "project-name", Value: request.Name})

	// read the user from context
	user, _ := ctx.Value(types.UserScope).(*models.User)

	proj := &models.Project{
		Name:                   request.Name,
		CapiProvisionerEnabled: true,
		SimplifiedViewEnabled:  true,
		HelmValuesEnabled:      false,
		MultiCluster:           false,
		EnableReprovision:      false,
	}

	var err error
	proj, _, err = CreateProjectWithUser(ctx, p.Repo().Project(), proj, user)

	if err != nil {
		err := telemetry.Error(ctx, span, err, "error creating project")
		p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	// create onboarding flow set to the first step
	_, err = p.Repo().Onboarding().CreateProjectOnboarding(&models.Onboarding{
		ProjectID:   proj.ID,
		CurrentStep: types.StepConnectSource,
	})

	if err != nil {
		err := telemetry.Error(ctx, span, err, "error creating project onboarding")
		p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
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
		err := telemetry.Error(ctx, span, err, "error creating project usage")
		p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	p.WriteResult(w, r, proj.ToProjectType(p.Config().LaunchDarklyClient))

	// add project to billing team
	_, err = p.Config().BillingManager.CreateTeam(user, proj)

	if err != nil {
		// we do not write error response, since setting up billing error can be
		// resolved later and may not be fatal
		err := telemetry.Error(ctx, span, err, "error adding project to new billing team")
		p.HandleAPIErrorNoWrite(w, r, apierrors.NewErrInternal(err))
	}

	p.Config().AnalyticsClient.Track(analytics.ProjectCreateTrack(&analytics.ProjectCreateDeleteTrackOpts{
		ProjectScopedTrackOpts: analytics.GetProjectScopedTrackOpts(user.ID, proj.ID),
	}))
}

func CreateProjectWithUser(
	ctx context.Context,
	projectRepo repository.ProjectRepository,
	proj *models.Project,
	user *models.User,
) (*models.Project, *models.Role, error) {
	ctx, span := telemetry.NewSpan(ctx, "create-project-with-user")
	defer span.End()

	proj, err := projectRepo.CreateProject(proj)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error creating project")
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
		err := telemetry.Error(ctx, span, err, "error adding user as admin in project")
		return nil, nil, err
	}

	// read the project again to get the model with the role attached
	proj, err = projectRepo.ReadProject(proj.ID)

	if err != nil {
		err := telemetry.Error(ctx, span, err, "error reading project")
		return nil, nil, err
	}

	return proj, role, nil
}
