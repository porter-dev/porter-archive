package billing

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"

	"github.com/gorilla/schema"
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

type CreateBillingCookieRequest struct {
	Email       string `json:"email" form:"required"`
	UserID      uint   `json:"user_id" form:"required"`
	ProjectID   uint   `json:"project_id" form:"required"`
	ProjectName string `json:"project_name" form:"required"`
}

type CreateBillingCookieResponse struct {
	Token   string `json:"token"`
	TokenID string `json:"token_id"`
}

type VerifyUserRequest struct {
	TokenID string `schema:"token_id" form:"required"`
	Token   string `schema:"token" form:"required"`
}

func (c *RedirectBillingHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	user, _ := r.Context().Value(types.UserScope).(*models.User)
	proj, _ := r.Context().Value(types.ProjectScope).(*models.Project)

	// at the moment, the user must be the first admin user on the project - otherwise, redirect back to
	// home page with error
	var isFirstAdminUser bool

	for _, role := range proj.Roles {
		if role.UserID == user.ID && role.Kind == types.RoleAdmin {
			isFirstAdminUser = true
			break
		}
	}

	if !isFirstAdminUser {
		http.Redirect(w, r, "/dashboard?error="+url.QueryEscape("Only the creator of the project can manage billing"), 302)
		return
	}

	// get an internal cookie
	data := &CreateBillingCookieRequest{
		ProjectName: proj.Name,
		ProjectID:   proj.ID,
		UserID:      user.ID,
		Email:       user.Email,
	}

	var strData []byte
	var err error

	if data != nil {
		strData, err = json.Marshal(data)

		if err != nil {
			c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}
	}

	req, err := http.NewRequest(
		"POST",
		fmt.Sprintf("%s/api/v1/private/cookie", c.Config().ServerConf.BillingPrivateServerURL),
		strings.NewReader(string(strData)),
	)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	req.Header.Set("Content-Type", "application/json; charset=utf-8")
	req.Header.Set("Accept", "application/json; charset=utf-8")
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.Config().ServerConf.BillingPrivateKey))

	httpClient := http.Client{}

	res, err := httpClient.Do(req)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	defer res.Body.Close()

	dst := &CreateBillingCookieResponse{}

	err = json.NewDecoder(res.Body).Decode(dst)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	redirectData := &VerifyUserRequest{
		TokenID: dst.TokenID,
		Token:   dst.Token,
	}

	vals := make(map[string][]string)
	err = schema.NewEncoder().Encode(redirectData, vals)

	urlVals := url.Values(vals)
	encodedURLVals := urlVals.Encode()

	reqURL := fmt.Sprintf("%s/api/v1/verify?%s", c.Config().ServerConf.BillingPublicServerURL, encodedURLVals)
	http.Redirect(w, r, reqURL, 302)
}
