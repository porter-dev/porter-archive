package billing

import (
	"fmt"
	"net/http"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

type BillingGetTokenHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

func NewBillingGetTokenHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) http.Handler {
	return &BillingGetTokenHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (c *BillingGetTokenHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	user, _ := r.Context().Value(types.UserScope).(*models.User)
	proj, _ := r.Context().Value(types.ProjectScope).(*models.Project)

	// we double-check that the user is an admin the project
	roles, err := c.Repo().Project().ListProjectRoles(proj.ID)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	for _, role := range roles {
		if role.UserID != 0 && role.UserID == user.ID {
			if role.Kind != types.RoleAdmin {
				c.HandleAPIError(w, r, apierrors.NewErrForbidden(
					fmt.Errorf("user %d is not an admin in project %d", user.ID, proj.ID),
				))

				return
			}
		}
	}

	token, err := c.Config().BillingManager.GetIDToken(proj.ID, user)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	c.WriteResult(w, r, &types.GetBillingTokenResponse{
		Token: token,
	})
}
