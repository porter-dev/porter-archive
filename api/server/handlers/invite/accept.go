package invite

import (
	"fmt"
	"net/http"
	"net/url"
	"strconv"

	"github.com/go-chi/chi"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/requestutils"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

type InviteAcceptHandler struct {
	handlers.PorterHandler
}

func NewInviteAcceptHandler(
	config *config.Config,
) *InviteAcceptHandler {
	return &InviteAcceptHandler{
		PorterHandler: handlers.NewDefaultPorterHandler(config, nil, nil),
	}
}

func (c *InviteAcceptHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	token, _ := requestutils.GetURLParamString(r, types.URLParamInviteToken)

	session, err := c.Config().Store.Get(r, c.Config().ServerConf.CookieName)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
	}

	userID, _ := session.Values["user_id"].(uint)

	user, err := c.Repo().User().ReadUser(userID)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	projectID, err := strconv.ParseUint(chi.URLParam(r, "project_id"), 0, 64)

	if err != nil || projectID == 0 {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	invite, err := c.Repo().Invite().ReadInviteByToken(token)

	if err != nil || invite.ProjectID != uint(projectID) {
		vals := url.Values{}
		vals.Add("error", "Invalid invite token")
		http.Redirect(w, r, fmt.Sprintf("/dashboard?%s", vals.Encode()), 302)

		return
	}

	// check that the invite has not expired and has not been accepted
	if invite.IsExpired() || invite.IsAccepted() {
		vals := url.Values{}
		vals.Add("error", "Invite has expired")
		http.Redirect(w, r, fmt.Sprintf("/dashboard?%s", vals.Encode()), 302)

		return
	}

	// check that the invite email matches the user's email
	if user.Email != invite.Email {
		vals := url.Values{}
		vals.Add("error", "Wrong email for invite")
		http.Redirect(w, r, fmt.Sprintf("/dashboard?%s", vals.Encode()), 302)

		return
	}

	kind := invite.Kind

	if kind == "" {
		kind = models.RoleDeveloper
	}

	project, err := c.Repo().Project().ReadProject(uint(projectID))

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	if _, err = c.Repo().Project().CreateProjectRole(project, &models.Role{
		Role: types.Role{
			UserID:    userID,
			ProjectID: project.ID,
			Kind:      types.RoleKind(kind),
		},
	}); err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	// update the invite
	invite.UserID = userID

	if _, err = c.Repo().Invite().UpdateInvite(invite); err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	http.Redirect(w, r, "/dashboard", 302)
}
