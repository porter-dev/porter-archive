package authn

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/internal/models"
)

func SaveUserAuthenticated(
	w http.ResponseWriter,
	r *http.Request,
	config *config.Config,
	user *models.User,
) error {
	session, err := config.Store.Get(r, config.ServerConf.CookieName)

	if err != nil {
		return err
	}

	var redirect string

	if valR := session.Values["redirect"]; valR != nil {
		redirect = session.Values["redirect"].(string)
	}

	session.Values["authenticated"] = true
	session.Values["user_id"] = user.ID
	session.Values["email"] = user.Email
	session.Values["redirect"] = redirect

	return session.Save(r, w)
}

func SaveUserUnauthenticated(
	w http.ResponseWriter,
	r *http.Request,
	config *config.Config,
) error {
	session, err := config.Store.Get(r, config.ServerConf.CookieName)

	if err != nil {
		return err
	}

	session.Values["authenticated"] = false
	session.Values["user_id"] = nil
	session.Values["email"] = nil
	return session.Save(r, w)
}
