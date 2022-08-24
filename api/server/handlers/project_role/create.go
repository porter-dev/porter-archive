package project_role

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/encryption"
	"github.com/porter-dev/porter/internal/models"
)

type CreateProjectRoleHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewCreateProjectRoleHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *CreateProjectRoleHandler {
	return &CreateProjectRoleHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (c *CreateProjectRoleHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	project, _ := r.Context().Value(types.ProjectScope).(*models.Project)
	user, _ := r.Context().Value(types.UserScope).(*models.User)

	request := &types.CreateProjectRoleRequest{}

	if ok := c.DecodeAndValidate(w, r, request); !ok {
		return
	}

	if request.Name == string(types.RoleAdmin) ||
		request.Name == string(types.RoleDeveloper) ||
		request.Name == string(types.RoleViewer) {
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(
			fmt.Errorf("default role names admin, developer, viewer are not allowed"), http.StatusConflict,
		))
		return
	}

	uid, err := encryption.GenerateRandomBytes(16)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	policyBytes, err := json.Marshal([]*types.PolicyDocument{request.Policy})

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	policy, err := c.Repo().Policy().CreatePolicy(&models.Policy{
		UniqueID:        uid,
		ProjectID:       project.ID,
		CreatedByUserID: user.ID,
		Name:            fmt.Sprintf("%s-project-role-policy", request.Name),
		PolicyBytes:     policyBytes,
	})

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	uid, err = encryption.GenerateRandomBytes(16)

	if err != nil {
		// we need to delete the policy we just created
		c.Repo().Policy().DeletePolicy(policy)

		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	role, err := c.Repo().ProjectRole().CreateProjectRole(&models.ProjectRole{
		UniqueID:  uid,
		ProjectID: project.ID,
		PolicyUID: policy.UniqueID,
		Name:      request.Name,
	})

	if err != nil {
		// we need to delete the policy we just created
		c.Repo().Policy().DeletePolicy(policy)

		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	if len(request.Users) > 0 {
		err = c.Repo().ProjectRole().UpdateUsersInProjectRole(project.ID, role.UniqueID, request.Users)

		if err != nil {
			// we need to delete the policy and project role we just created
			c.Repo().Policy().DeletePolicy(policy)
			c.Repo().ProjectRole().DeleteProjectRole(role)

			c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}
	}

	w.WriteHeader(http.StatusCreated)
}
