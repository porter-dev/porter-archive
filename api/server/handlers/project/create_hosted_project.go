package project

import (
	"net/http"

	"connectrpc.com/connect"
	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"

	"github.com/porter-dev/porter/internal/telemetry"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/analytics"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
)

type HostedProjectCreateHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewHostedProjectCreateHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *HostedProjectCreateHandler {
	return &HostedProjectCreateHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

type CreateHostedProjectRequest struct {
	Name string `json:"name" form:"required"`
	Code string `json:"code" form:"required"`
}

type CreateHostedProjectResponse types.Project

func (p *HostedProjectCreateHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-hosted-project-create")
	defer span.End()

	request := &CreateHostedProjectRequest{}

	ok := p.DecodeAndValidate(w, r, request)
	if !ok {
		return
	}

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "project-name", Value: request.Name},
		telemetry.AttributeKV{Key: "code", Value: request.Code},
	)

	if request.Name == "" {
		err := telemetry.Error(ctx, span, nil, "project name cannot be empty")
		p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}
	if request.Code == "" {
		err := telemetry.Error(ctx, span, nil, "code cannot be empty")
		p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	// read the user from context
	user, _ := r.Context().Value(types.UserScope).(*models.User)

	proj := &models.Project{
		Name: request.Name,
	}

	var err error
	proj, _, err = CreateHostedProjectWithUser(p.Repo().Project(), proj, user)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error creating project with user")
		p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	req := connect.NewRequest(&porterv1.ConnectHostedProjectRequest{
		ProjectId: int64(proj.ID),
		Code:      request.Code,
	})
	_, err = p.Config().ClusterControlPlaneClient.ConnectHostedProject(ctx, req)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error connecting hosted project")
		p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	// I don't think I need this?

	//// create onboarding flow set to the first step
	//_, err = p.Repo().Onboarding().CreateProjectOnboarding(&models.Onboarding{
	//	ProjectID:   proj.ID,
	//	CurrentStep: types.StepConnectSource,
	//})
	//if err != nil {
	//	p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
	//	return
	//}

	// create default project usage restriction
	_, err = p.Repo().ProjectUsage().CreateProjectUsage(&models.ProjectUsage{
		ProjectID:      proj.ID,
		ResourceCPU:    types.BasicPlan.ResourceCPU,
		ResourceMemory: types.BasicPlan.ResourceMemory,
		Clusters:       types.BasicPlan.Clusters,
		Users:          types.BasicPlan.Users,
	})

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	p.WriteResult(w, r, proj.ToProjectType(p.Config().LaunchDarklyClient))

	// add project to billing team
	_, err = p.Config().BillingManager.CreateTeam(user, proj)

	if err != nil {
		// we do not write error response, since setting up billing error can be
		// resolved later and may not be fatal
		p.HandleAPIErrorNoWrite(w, r, apierrors.NewErrInternal(err))
	}

	p.Config().AnalyticsClient.Track(analytics.ProjectCreateTrack(&analytics.ProjectCreateDeleteTrackOpts{
		ProjectScopedTrackOpts: analytics.GetProjectScopedTrackOpts(user.ID, proj.ID),
	}))
}

func CreateHostedProjectWithUser(
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
