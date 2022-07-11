package billing

import (
	"net/http"
	"net/url"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

type RedirectBillingHandler struct {
	handlers.PorterHandlerWriter
}

func NewRedirectBillingHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *RedirectBillingHandler {
	return &RedirectBillingHandler{
		PorterHandlerWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
	}
}

func (c *RedirectBillingHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	user, _ := r.Context().Value(types.UserScope).(*models.User)
	proj, _ := r.Context().Value(types.ProjectScope).(*models.Project)

	if len(proj.Roles) == 0 {
		http.Redirect(w, r, "/dashboard?error="+url.QueryEscape("Only the creator of the project can manage billing"), 302)
		return
	}

	// at the moment, the user must be the first admin user on the project - otherwise, redirect back to
	// home page with error
	var firstAdminRoleID uint = proj.Roles[0].ID
	var currUserRoleID uint = 0

	for _, role := range proj.Roles {
		if role.UserID == user.ID && role.Kind == types.RoleAdmin {
			currUserRoleID = role.ID
		}

		if role.Kind == types.RoleAdmin && role.ID <= firstAdminRoleID {
			firstAdminRoleID = role.ID
		}
	}

	if currUserRoleID == 0 || currUserRoleID != firstAdminRoleID {
		http.Redirect(w, r, "/dashboard?error="+url.QueryEscape("Only the creator of the project can manage billing"), 302)
		return
	}

	redirectURI, err := c.Config().BillingManager.GetRedirectURI(user, proj)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	http.Redirect(w, r, redirectURI, 302)
}
