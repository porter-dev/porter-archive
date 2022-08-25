package project

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/shared/apierrors"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

type CollaboratorsListHandler struct {
	handlers.PorterHandlerWriter
}

func NewCollaboratorsListHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *CollaboratorsListHandler {
	return &CollaboratorsListHandler{
		PorterHandlerWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
	}
}

func (p *CollaboratorsListHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	proj, _ := r.Context().Value(types.ProjectScope).(*models.Project)

	var res types.ListCollaboratorsResponse

	roles, err := p.Repo().ProjectRole().ListProjectRoles(proj.ID)

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	if len(roles) > 0 {
		userCollaboratorMap := make(map[uint]*types.Collaborator)

		for _, role := range roles {
			for _, user := range role.Users {
				if _, ok := userCollaboratorMap[user.ID]; ok {
					userCollaboratorMap[user.ID].RoleUIDs = append(userCollaboratorMap[user.ID].RoleUIDs, role.UniqueID)
				} else {
					userCollaboratorMap[user.ID] = &types.Collaborator{
						RoleUIDs:  []string{role.UniqueID},
						UserID:    user.ID,
						Email:     user.Email,
						ProjectID: proj.ID,
					}
				}
			}
		}

		for _, user := range userCollaboratorMap {
			res = append(res, user)
		}
	}

	p.WriteResult(w, r, res)
}
