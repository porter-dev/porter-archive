package project_role

import (
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

type DeleteProjectRoleHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewDeleteProjectRoleHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *DeleteProjectRoleHandler {
	return &DeleteProjectRoleHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (c *DeleteProjectRoleHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	project, _ := r.Context().Value(types.ProjectScope).(*models.Project)

	if !project.AdvancedRBACEnabled {
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(
			errors.New("advanced RBAC is not enabled for this project"), http.StatusPreconditionFailed,
		))
		return
	}

	roleUID, reqErr := requestutils.GetURLParamString(r, types.URLParamProjectRoleID)

	if reqErr != nil {
		c.HandleAPIError(w, r, reqErr)
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
			fmt.Errorf("cannot delete default project role"), http.StatusConflict,
		))
		return
	}

	if len(role.Users) > 0 {
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(
			fmt.Errorf("role has one or more users assigned"), http.StatusPreconditionFailed,
		))
		return
	}

	policy, err := c.Repo().Policy().ReadPolicy(project.ID, role.PolicyUID)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	_, err = c.Repo().Policy().DeletePolicy(policy)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	_, err = c.Repo().ProjectRole().DeleteProjectRole(role)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}
}
