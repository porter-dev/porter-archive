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

type GetProjectRoleHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewGetProjectRoleHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *GetProjectRoleHandler {
	return &GetProjectRoleHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (c *GetProjectRoleHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	project, _ := r.Context().Value(types.ProjectScope).(*models.Project)

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

	policy, err := c.Repo().Policy().ReadPolicy(project.ID, role.PolicyUID)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	policyType, err := policy.ToAPIPolicyType()

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	c.WriteResult(w, r, role.ToProjectRoleType(policyType.Policy[0]))
}
