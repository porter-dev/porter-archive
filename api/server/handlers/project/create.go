package project

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/analytics"
	"github.com/porter-dev/porter/internal/encryption"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
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
	request := &types.CreateProjectRequest{}

	ok := p.DecodeAndValidate(w, r, request)

	if !ok {
		return
	}

	// read the user from context
	user, _ := r.Context().Value(types.UserScope).(*models.User)

	proj, err := p.Repo().Project().CreateProject(&models.Project{
		Name: request.Name,
	})

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	err = createDefaultProjectRoles(proj.ID, user.ID, p.Repo())

	if err != nil {
		// we need to first delete the default project roles we just created
		deleteAllProjectRoles(proj.ID, p.Repo())

		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	// create onboarding flow set to the first step
	_, err = p.Repo().Onboarding().CreateProjectOnboarding(&models.Onboarding{
		ProjectID:   proj.ID,
		CurrentStep: types.StepConnectSource,
	})

	if err != nil {
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
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	p.WriteResult(w, r, proj.ToProjectType())

	// add project to billing team
	_, err = p.Config().BillingManager.CreateTeam(user, proj)

	if err != nil {
		// we do not write error response, since setting up billing error can be
		// resolved later and may not be fatal
		p.HandleAPIErrorNoWrite(w, r, apierrors.NewErrInternal(err))
	}

	p.Config().AnalyticsClient.Track(analytics.ProjectCreateTrack(&analytics.ProjectCreateTrackOpts{
		ProjectScopedTrackOpts: analytics.GetProjectScopedTrackOpts(user.ID, proj.ID),
	}))
}

func createDefaultProjectRoles(projectID, userID uint, repo repository.Repository) error {
	for _, kind := range []types.RoleKind{types.RoleAdmin, types.RoleDeveloper, types.RoleViewer} {
		uid, err := encryption.GenerateRandomBytes(16)

		if err != nil {
			return err
		}

		var policyBytes []byte

		switch kind {
		case types.RoleAdmin:
			policyBytes, err = json.Marshal(types.AdminPolicy)

			if err != nil {
				return err
			}
		case types.RoleDeveloper:
			policyBytes, err = json.Marshal(types.DeveloperPolicy)

			if err != nil {
				return err
			}
		case types.RoleViewer:
			policyBytes, err = json.Marshal(types.ViewerPolicy)

			if err != nil {
				return err
			}
		}

		policy, err := repo.Policy().CreatePolicy(&models.Policy{
			UniqueID:        uid,
			ProjectID:       projectID,
			CreatedByUserID: userID,
			Name:            fmt.Sprintf("%s-project-role-policy", kind),
			PolicyBytes:     policyBytes,
		})

		if err != nil {
			return err
		}

		role, err := repo.ProjectRole().CreateProjectRole(&models.ProjectRole{
			UniqueID:  fmt.Sprintf("%d-%s", projectID, kind),
			ProjectID: projectID,
			PolicyUID: policy.UniqueID,
			Name:      string(kind),
		})

		if err != nil {
			return err
		}

		if kind == types.RoleAdmin {
			err := repo.ProjectRole().UpdateUsersInProjectRole(projectID, role.UniqueID, []uint{userID})

			if err != nil {
				return err
			}
		}
	}

	return nil
}
