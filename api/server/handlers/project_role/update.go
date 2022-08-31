package project_role

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/requestutils"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"gorm.io/gorm"
)

type UpdateProjectRoleHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewUpdateProjectRoleHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *UpdateProjectRoleHandler {
	return &UpdateProjectRoleHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (c *UpdateProjectRoleHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	project, _ := r.Context().Value(types.ProjectScope).(*models.Project)

	roleUID, reqErr := requestutils.GetURLParamString(r, types.URLParamProjectRoleID)

	if reqErr != nil {
		c.HandleAPIError(w, r, reqErr)
		return
	}

	request := &types.UpdateProjectRoleRequest{}

	if ok := c.DecodeAndValidate(w, r, request); !ok {
		return
	}

	role, err := c.Repo().ProjectRole().ReadProjectRole(project.ID, roleUID)

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.HandleAPIError(w, r, apierrors.NewErrNotFound(fmt.Errorf("no such project role exists")))
			return
		}

		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	if role.IsDefaultRole() {
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(
			fmt.Errorf("cannot update default project roles"), http.StatusBadRequest,
		))
		return
	}

	if request.Name != "" && request.Name != role.Name {
		if request.Name == string(types.RoleAdmin) ||
			request.Name == string(types.RoleDeveloper) ||
			request.Name == string(types.RoleViewer) {
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(
				fmt.Errorf("default role names admin, developer, viewer are not allowed"), http.StatusConflict,
			))
			return
		}

		role.Name = request.Name

		role, err = c.Repo().ProjectRole().UpdateProjectRole(role)

		if err != nil {
			c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}
	}

	if len(request.Users) == 0 {
		err = c.Repo().ProjectRole().ClearUsersInProjectRole(project.ID, roleUID)

		if err != nil {
			c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}
	} else {
		for _, u := range request.Users {
			err := validateUserForProjectRole(c.Repo(), u, project.ID)

			if err != nil {
				c.HandleAPIError(w, r, err)
				return
			}
		}

		err = c.Repo().ProjectRole().UpdateUsersInProjectRole(project.ID, roleUID, request.Users)

		if err != nil {
			c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}
	}

	if request.Policy != nil {
		policy, err := c.Repo().Policy().ReadPolicy(project.ID, role.PolicyUID)

		if err != nil {
			c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}

		policyBytes, err := json.Marshal([]*types.PolicyDocument{request.Policy})

		if err != nil {
			c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}

		policy.PolicyBytes = policyBytes

		_, err = c.Repo().Policy().UpdatePolicy(policy)

		if err != nil {
			c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}
	}
}
