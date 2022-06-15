package commonutils

import (
	"github.com/porter-dev/porter/api/server/shared/config"
	ints "github.com/porter-dev/porter/internal/models/integrations"
	"golang.org/x/oauth2"
)

func GetGitlabOAuthConf(conf *config.Config, giIntegration *ints.GitlabIntegration) *oauth2.Config {
	return &oauth2.Config{
		ClientID:     string(giIntegration.AppClientID),
		ClientSecret: string(giIntegration.AppClientSecret),
		Endpoint: oauth2.Endpoint{
			AuthURL:  giIntegration.InstanceURL + "/oauth/authorize",
			TokenURL: giIntegration.InstanceURL + "/oauth/token",
		},
		RedirectURL: conf.ServerConf.ServerURL + "/api/oauth/gitlab/callback",
		Scopes:      []string{"api", "profile", "email"},
	}
}
