package gitinstallation

import (
	"fmt"
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared/config"
)

type GithubAppInstallHandler struct {
	handlers.PorterHandler
}

func NewGithubAppInstallHandler(
	config *config.Config,
) *GithubAppInstallHandler {
	return &GithubAppInstallHandler{
		PorterHandler: handlers.NewDefaultPorterHandler(config, nil, nil),
	}
}

func (c *GithubAppInstallHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	http.Redirect(w, r, fmt.Sprintf("https://github.com/apps/%s/installations/new", c.Config().GithubAppConf.AppName), 302)
}
