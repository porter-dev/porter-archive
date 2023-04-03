package gitinstallation

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
)

type GithubGetPermissionsHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

func NewGithubGetPermissionsHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *GithubGetPermissionsHandler {
	return &GithubGetPermissionsHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (c *GithubGetPermissionsHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	p, err := GetGithubAppPermissions(c.Config(), r)
	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	c.WriteResult(w, r, &types.GitInstallationPermission{
		PreviewEnvironments: p.Administration == "write" &&
			p.Deployments == "write" &&
			p.Environments == "write" &&
			p.PullRequests == "write" &&
			p.RepositoryWebhook == "write",
	})
}
