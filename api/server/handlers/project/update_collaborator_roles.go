package project

import (
	"errors"
	"fmt"
	"net/http"

	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/requestutils"
	"gorm.io/gorm"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

type UpdateCollaboratorRolesHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewUpdateCollaboratorRolesHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *UpdateCollaboratorRolesHandler {
	return &UpdateCollaboratorRolesHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (p *UpdateCollaboratorRolesHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	proj, _ := r.Context().Value(types.ProjectScope).(*models.Project)

	userID, reqErr := requestutils.GetURLParamUint(r, "user_id")

	if reqErr != nil {
		p.HandleAPIError(w, r, reqErr)
		return
	}

	request := &types.UpdateCollaboratorRoleRequest{}

	ok := p.DecodeAndValidate(w, r, request)

	if !ok {
		return
	}

	if len(request.RoleUIDs) == 0 {
		p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(
			fmt.Errorf("roles cannot be empty"), http.StatusPreconditionFailed,
		))
		return
	}

	// check for valid user ID
	_, err := p.Repo().User().ReadUser(userID)

	if err != nil && errors.Is(err, gorm.ErrRecordNotFound) {
		p.HandleAPIError(w, r, apierrors.NewErrNotFound(fmt.Errorf("user not found")))
		return
	} else if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	rolesMap := make(map[string]*models.ProjectRole)

	// check for valid project roles
	for _, roleUID := range request.RoleUIDs {
		role, err := p.Repo().ProjectRole().ReadProjectRole(proj.ID, roleUID)

		if err != nil && errors.Is(err, gorm.ErrRecordNotFound) {
			p.HandleAPIError(w, r, apierrors.NewErrNotFound(fmt.Errorf("role not found in project: %s", roleUID)))
			return
		} else if err != nil {
			p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}

		rolesMap[roleUID] = role
	}

	userRoles, err := p.Repo().ProjectRole().ListAllRolesForUser(proj.ID, userID)

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	if len(userRoles) == 0 {
		p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(
			fmt.Errorf("user is not a collaborator in this project"), http.StatusBadRequest,
		))
		return
	}

	userRolesMap := make(map[string]bool)

	for _, role := range userRoles {
		userRolesMap[role.UniqueID] = true
	}

	var rolesToAdd []string
	var rolesToRemove []string

	for _, uid := range userRoles {
		if _, ok := rolesMap[uid.UniqueID]; !ok {
			// user had this role, should be removed from
			rolesToRemove = append(rolesToRemove, uid.UniqueID)
		}
	}

	for _, uid := range request.RoleUIDs {
		if _, ok := userRolesMap[uid]; !ok {
			// user does not have this role, should be added to
			rolesToAdd = append(rolesToAdd, uid)
		}
	}

	for _, uid := range rolesToAdd {
		role, err := p.Repo().ProjectRole().ReadProjectRole(proj.ID, uid)

		if err != nil {
			p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}

		userIDs := role.GetUserIDs()
		userIDs = append(userIDs, userID)

		err = p.Repo().ProjectRole().UpdateUsersInProjectRole(proj.ID, uid, userIDs)

		if err != nil {
			p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}
	}

	for _, uid := range rolesToRemove {
		role, err := p.Repo().ProjectRole().ReadProjectRole(proj.ID, uid)

		if err != nil {
			p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}

		userIDs := role.GetUserIDs()
		var newUserIDs []uint

		for _, id := range userIDs {
			if id != userID {
				newUserIDs = append(newUserIDs, id)
			}
		}

		err = p.Repo().ProjectRole().UpdateUsersInProjectRole(proj.ID, uid, newUserIDs)

		if err != nil {
			p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}
	}
}
