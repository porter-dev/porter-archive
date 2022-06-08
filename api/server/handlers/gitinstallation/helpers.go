package gitinstallation

import (
	"context"
	"net/http"

	ghinstallation "github.com/bradleyfalzon/ghinstallation/v2"
	"github.com/google/go-github/v41/github"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/models/integrations"
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

// GetGithubAppClientFromRequest gets the github app installation id from the request and authenticates
// using it and a private key file
func GetGithubAppClientFromRequest(config *config.Config, r *http.Request) (*github.Client, error) {
	// get installation id from context
	ga, _ := r.Context().Value(types.GitInstallationScope).(*integrations.GithubAppInstallation)

	itr, err := ghinstallation.NewKeyFromFile(
		http.DefaultTransport,
		config.GithubAppConf.AppID,
		ga.InstallationID,
		config.GithubAppConf.SecretPath,
	)

	if err != nil {
		return nil, err
	}

	return github.NewClient(&http.Client{Transport: itr}), nil
}

type GithubAppPermissions struct {
	Actions           string
	Administration    string
	Contents          string
	Deployments       string
	Environments      string
	Metadata          string
	PullRequests      string
	Secrets           string
	Workflows         string
	RepositoryWebhook string
}

// GetGithubAppClientFromRequest gets the github app installation id from the request and authenticates
// using it and a private key file
func GetGithubAppPermissions(config *config.Config, r *http.Request) (*GithubAppPermissions, error) {
	// get installation id from context
	ga, _ := r.Context().Value(types.GitInstallationScope).(*integrations.GithubAppInstallation)

	itr, err := ghinstallation.NewKeyFromFile(
		http.DefaultTransport,
		config.GithubAppConf.AppID,
		ga.InstallationID,
		config.GithubAppConf.SecretPath,
	)

	if err != nil {
		return nil, err
	}

	// need to request the token before permissions can be verified
	_, err = itr.Token(context.Background())

	if err != nil {
		return nil, err
	}

	permissions, err := itr.Permissions()

	return &GithubAppPermissions{
		Actions:           permissionToString(permissions.Actions),
		Administration:    permissionToString(permissions.Administration),
		Contents:          permissionToString(permissions.Contents),
		Deployments:       permissionToString(permissions.Deployments),
		Environments:      permissionToString(permissions.Environments),
		Metadata:          permissionToString(permissions.Metadata),
		PullRequests:      permissionToString(permissions.PullRequests),
		Secrets:           permissionToString(permissions.Secrets),
		Workflows:         permissionToString(permissions.Workflows),
		RepositoryWebhook: permissionToString(permissions.RepositoryHooks),
	}, err
}

func permissionToString(permission *string) string {
	if permission == nil {
		return ""
	}

	return *permission
}
