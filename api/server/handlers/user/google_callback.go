package user

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"net/url"
	"strings"

	"golang.org/x/oauth2"
	"gorm.io/gorm"

	"github.com/porter-dev/porter/api/server/authn"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/internal/analytics"
	"github.com/porter-dev/porter/internal/models"
)

type UserOAuthGoogleCallbackHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewUserOAuthGoogleCallbackHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *UserOAuthGoogleCallbackHandler {
	return &UserOAuthGoogleCallbackHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (p *UserOAuthGoogleCallbackHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	session, err := p.Config().Store.Get(r, p.Config().ServerConf.CookieName)

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	if _, ok := session.Values["state"]; !ok {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	if r.URL.Query().Get("state") != session.Values["state"] {
		p.HandleAPIError(w, r, apierrors.NewErrForbidden(err))
		return
	}

	token, err := p.Config().GoogleConf.Exchange(oauth2.NoContext, r.URL.Query().Get("code"))

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrForbidden(err))
		return
	}

	if !token.Valid() {
		p.HandleAPIError(w, r, apierrors.NewErrForbidden(fmt.Errorf("invalid token")))
		return
	}

	// otherwise, create the user if not exists
	user, err := upsertGoogleUserFromToken(p.Config(), token)

	if err != nil && strings.Contains(err.Error(), "already registered") {
		http.Redirect(w, r, "/login?error="+url.QueryEscape(err.Error()), 302)
		return
	} else if err != nil && strings.Contains(err.Error(), "restricted domain group") {
		http.Redirect(w, r, "/login?error="+url.QueryEscape(err.Error()), 302)
		return
	} else if err != nil {
		http.Error(w, http.StatusText(http.StatusForbidden), http.StatusForbidden)
		return
	}

	p.Config().AnalyticsClient.Identify(analytics.CreateSegmentIdentifyUser(user))

	// save the user as authenticated in the session
	if err := authn.SaveUserAuthenticated(w, r, p.Config(), user); err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	// non-fatal send email verification
	if !user.EmailVerified {
		startEmailVerification(p.Config(), w, r, user)
	}

	if session.Values["query_params"] != "" {
		http.Redirect(w, r, fmt.Sprintf("/dashboard?%s", session.Values["query_params"]), 302)
	} else {
		http.Redirect(w, r, "/dashboard", 302)
	}
}

func upsertGoogleUserFromToken(config *config.Config, tok *oauth2.Token) (*models.User, error) {
	gInfo, err := getGoogleUserInfoFromToken(tok)

	if err != nil {
		return nil, err
	}

	if err := checkUserRestrictions(config.ServerConf, gInfo.Email); err != nil {
		return nil, err
	}

	// if the app has a restricted domain, check the `hd` query param
	if config.ServerConf.GoogleRestrictedDomain != "" {
		if gInfo.HD != config.ServerConf.GoogleRestrictedDomain {
			return nil, fmt.Errorf("Email is not in the restricted domain group.")
		}
	}

	user, err := config.Repo.User().ReadUserByGoogleUserID(gInfo.Sub)

	// if the user does not exist, create new user
	if err != nil && err == gorm.ErrRecordNotFound {
		// check if a user with that email address already exists
		_, err = config.Repo.User().ReadUserByEmail(gInfo.Email)

		if err == gorm.ErrRecordNotFound {
			user = &models.User{
				Email:         gInfo.Email,
				EmailVerified: !config.Metadata.Email || gInfo.EmailVerified,
				GoogleUserID:  gInfo.Sub,
			}

			user, err = config.Repo.User().CreateUser(user)

			if err != nil {
				return nil, err
			}

			config.AnalyticsClient.Track(analytics.UserCreateTrack(&analytics.UserCreateTrackOpts{
				UserScopedTrackOpts: analytics.GetUserScopedTrackOpts(user.ID),
				Email:               user.Email,
			}))
		} else if err == nil {
			return nil, fmt.Errorf("email already registered")
		} else if err != nil {
			return nil, err
		}
	} else if err != nil {
		return nil, fmt.Errorf("unexpected error occurred:%s", err.Error())
	}

	return user, nil
}

type googleUserInfo struct {
	Email         string `json:"email"`
	EmailVerified bool   `json:"email_verified"`
	HD            string `json:"hd"`
	Sub           string `json:"sub"`
}

func getGoogleUserInfoFromToken(tok *oauth2.Token) (*googleUserInfo, error) {
	// use userinfo endpoint for Google OIDC to get claims
	url := "https://openidconnect.googleapis.com/v1/userinfo"

	req, err := http.NewRequest("GET", url, nil)

	req.Header.Add("Authorization", "Bearer "+tok.AccessToken)

	client := &http.Client{}

	response, err := client.Do(req)

	if err != nil {
		return nil, fmt.Errorf("failed getting user info: %s", err.Error())
	}

	defer response.Body.Close()

	contents, err := ioutil.ReadAll(response.Body)

	if err != nil {
		return nil, fmt.Errorf("failed reading response body: %s", err.Error())
	}

	// parse contents into Google userinfo claims
	gInfo := &googleUserInfo{}
	err = json.Unmarshal(contents, &gInfo)

	return gInfo, nil
}
