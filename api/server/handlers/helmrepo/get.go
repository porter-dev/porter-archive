package helmrepo

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

type HelmRepoGetHandler struct {
	handlers.PorterHandlerWriter
	authz.KubernetesAgentGetter
}

func NewHelmRepoGetHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *HelmRepoGetHandler {
	return &HelmRepoGetHandler{
		PorterHandlerWriter:   handlers.NewDefaultPorterHandler(config, nil, writer),
		KubernetesAgentGetter: authz.NewOutOfClusterAgentGetter(config),
	}
}

func (c *HelmRepoGetHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	helmRepo, _ := r.Context().Value(types.HelmRepoScope).(*models.HelmRepo)

	c.WriteResult(w, r, helmRepo.ToHelmRepoType())
}
