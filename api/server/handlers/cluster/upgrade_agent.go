package cluster

import (
	"fmt"
	"net/http"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/helm"
	"github.com/porter-dev/porter/internal/helm/loader"
	"github.com/porter-dev/porter/internal/models"
)

type UpgradeAgentHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

func NewUpgradeAgentHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *UpgradeAgentHandler {
	return &UpgradeAgentHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

func (c *UpgradeAgentHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)
	helmAgent, err := c.GetHelmAgent(r, cluster, "porter-agent-system")

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	currRelease, err := helmAgent.GetRelease("porter-agent", 0, false)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	chart, err := loader.LoadChartPublic(c.Config().ServerConf.DefaultAddonHelmRepoURL, "porter-agent", "")

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	newValues := currRelease.Config

	// TODO: update values
	// newValues["redis"] =

	_, err = helmAgent.UpgradeReleaseByValues(&helm.UpgradeReleaseConfig{
		Chart:      chart,
		Name:       "porter-agent",
		Values:     newValues,
		Cluster:    cluster,
		Repo:       c.Repo(),
		Registries: []*models.Registry{},
	}, c.Config().DOConf, c.Config().ServerConf.DisablePullSecretsInjection)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(
			fmt.Errorf("error upgrading the chart: %s", err.Error()),
			http.StatusBadRequest,
		))

		return
	}

	w.WriteHeader(http.StatusOK)
}
