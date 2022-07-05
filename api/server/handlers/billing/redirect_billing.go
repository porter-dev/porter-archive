package billing

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

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
	ProjectID uint `json:"project_id" form:"required"`
	UserID    uint `json:"user_id" form:"required"`
}

type CreateBillingCookieResponse struct {
	Cookie string `json:"cookie"`
}

func (c *RedirectBillingHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	user, _ := r.Context().Value(types.UserScope).(*models.User)
	proj, _ := r.Context().Value(types.ProjectScope).(*models.Project)

	// get an internal cookie
	data := &CreateBillingCookieRequest{
		ProjectID: proj.ID,
		UserID:    user.ID,
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

	if dst != nil {
		err = json.NewDecoder(res.Body).Decode(dst)

		if err != nil {
			c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}
	}

	w.Header().Add("Set-Cookie", dst.Cookie)
	http.Redirect(w, r, c.Config().ServerConf.BillingPublicServerURL, 302)
}
