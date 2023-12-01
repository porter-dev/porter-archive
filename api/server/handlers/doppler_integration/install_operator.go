package doppler

import (
	"context"
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
	"github.com/porter-dev/porter/internal/telemetry"
)

const (
	monitoringNodeLabel = "porter.run/workload-kind=monitoring"
)

type InstallDopplerHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

func NewInstallDopplerHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *InstallDopplerHandler {
	return &InstallDopplerHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

func (c *InstallDopplerHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-install-doppler-handler")
	defer span.End()

	cluster, _ := ctx.Value(types.ClusterScope).(*models.Cluster)

	helmAgent, err := c.GetHelmAgent(ctx, r, cluster, "default")
	if err != nil {
		err = telemetry.Error(ctx, span, err, "failed to get helm agent")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	chart, err := loader.LoadChartPublic(ctx, "https://helm.doppler.com", "doppler/doppler-kubernetes-operator", "")
	if err != nil {
		err = telemetry.Error(ctx, span, err, "failed load public doppler operator chart")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	// create namespace if not exists
	_, err = helmAgent.K8sAgent.CreateNamespace("doppler", nil)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "failed to create doppler namespace")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	conf := &helm.InstallChartConfig{
		Chart:     chart,
		Name:      "doppler",
		Namespace: "doppler",
		Cluster:   cluster,
		Repo:      c.Repo(),
	}

	_, err = helmAgent.InstallChart(context.Background(), conf, c.Config().DOConf, c.Config().ServerConf.DisablePullSecretsInjection)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error installing doppler operator")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	w.WriteHeader(http.StatusOK)
}
