package release

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/config"
)

type NewGetIncidentsByReleaseName struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

func NewGetIncidentsByReleaseNameHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *NewGetIncidentsByReleaseName {
	return &NewGetIncidentsByReleaseName{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

func (c *NewGetIncidentsByReleaseName) ServeHTTP(w http.ResponseWriter, r *http.Request) {

}
