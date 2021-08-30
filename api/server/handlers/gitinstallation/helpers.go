package gitinstallation

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/oauth"
	"golang.org/x/oauth2"
)

// GetGithubAppOauthTokenFromRequest gets the GH oauth token from the request based on the currently
// logged in user
func GetGithubAppOauthTokenFromRequest(config *config.Config, r *http.Request) (*oauth2.Token, error) {
	// read the user from context
	user, _ := r.Context().Value(types.UserScope).(*models.User)

	getOAuthInt := config.Repo.GithubAppOAuthIntegration().ReadGithubAppOauthIntegration
	oauthInt, err := getOAuthInt(user.GithubAppIntegrationID)

	if err != nil {
		return nil, err
	}

	_, _, err = oauth.GetAccessToken(oauthInt.SharedOAuthModel,
		&config.GithubAppConf.Config,
		oauth.MakeUpdateGithubAppOauthIntegrationFunction(oauthInt, config.Repo),
	)

	if err != nil {
		// try again, in case the token got updated
		oauthInt2, err := getOAuthInt(user.GithubAppIntegrationID)

		if err != nil || oauthInt2.Expiry == oauthInt.Expiry {
			return nil, err
		}
		oauthInt.AccessToken = oauthInt2.AccessToken
		oauthInt.RefreshToken = oauthInt2.RefreshToken
		oauthInt.Expiry = oauthInt2.Expiry
	}

	return &oauth2.Token{
		AccessToken:  string(oauthInt.AccessToken),
		RefreshToken: string(oauthInt.RefreshToken),
		Expiry:       oauthInt.Expiry,
		TokenType:    "Bearer",
	}, nil
}
