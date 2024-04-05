package cluster

import (
	"context"
	"fmt"
	"net/http"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/auth/token"
	"github.com/porter-dev/porter/internal/helm"
	"github.com/porter-dev/porter/internal/helm/loader"
	"github.com/porter-dev/porter/internal/kubernetes"
	"github.com/porter-dev/porter/internal/kubernetes/nodes"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/telemetry"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

const (
	monitoringNodeLabel = "porter.run/workload-kind=monitoring"
	olderAgentLabel     = "control-plane=controller-manager"
)

type InstallAgentHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

func NewInstallAgentHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *InstallAgentHandler {
	return &InstallAgentHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

func (c *InstallAgentHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-install-agent-handler")
	defer span.End()

	proj, _ := ctx.Value(types.ProjectScope).(*models.Project)
	user, _ := ctx.Value(types.UserScope).(*models.User)
	cluster, _ := ctx.Value(types.ClusterScope).(*models.Cluster)

	k8sAgent, err := c.GetAgent(r, cluster, "porter-agent-system")
	if err != nil {
		err = telemetry.Error(ctx, span, err, "failed to get kubernetes agent")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	helmAgent, err := c.GetHelmAgent(ctx, r, cluster, "porter-agent-system")
	if err != nil {
		err = telemetry.Error(ctx, span, err, "failed to get helm agent")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	err = checkAndDeleteOlderAgent(k8sAgent, helmAgent)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "unable to delete older agent")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	chart, err := loader.LoadChartPublic(ctx, c.Config().ServerConf.DefaultAddonHelmRepoURL, "porter-agent", "")
	if err != nil {
		err = telemetry.Error(ctx, span, err, "failed load public porter-agent chart")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	// create namespace if not exists
	_, err = helmAgent.K8sAgent.CreateNamespace("porter-agent-system", nil)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "failed to get create porter-agent-system namespace")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	// add api token to values
	jwt, err := token.GetTokenForAPI(user.ID, proj.ID)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "failed to get porter-agent api token")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	encoded, err := jwt.EncodeToken(c.Config().TokenConf)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "failed to encode porter-agent api token")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	nodes, err := nodes.ListNodesByLabels(k8sAgent.Clientset, "porter.run/workload-kind=monitoring")
	hasMonitoringNodes := err == nil && len(nodes) >= 1

	porterAgentValues := map[string]interface{}{
		"agent": map[string]interface{}{
			"porterHost":    c.Config().ServerConf.ServerURL,
			"porterPort":    "443",
			"porterToken":   encoded,
			"clusterID":     fmt.Sprintf("%d", cluster.ID),
			"projectID":     fmt.Sprintf("%d", proj.ID),
			"prometheusURL": c.Config().ServerConf.PrometheusUrl,
			"metronomeKey":  c.Config().ServerConf.MetronomeAPIKey,
		},
		"loki": map[string]interface{}{},
	}

	// case on whether a node with porter.run/workload-kind=monitoring exists. If it does, we place loki in that node group.
	if hasMonitoringNodes {
		sharedNS := map[string]interface{}{
			"porter.run/workload-kind": "monitoring",
		}

		sharedTolerations := []map[string]interface{}{
			{
				"key":      "porter.run/workload-kind",
				"operator": "Equal",
				"value":    "monitoring",
				"effect":   "NoSchedule",
			},
		}

		porterAgentValues["loki"] = map[string]interface{}{
			"nodeSelector": sharedNS,
			"tolerations":  sharedTolerations,
		}

		porterAgentValues["nodeSelector"] = sharedNS
		porterAgentValues["tolerations"] = sharedTolerations
	}

	conf := &helm.InstallChartConfig{
		Chart:     chart,
		Name:      "porter-agent",
		Namespace: "porter-agent-system",
		Cluster:   cluster,
		Repo:      c.Repo(),
		Values:    porterAgentValues,
	}

	_, err = helmAgent.InstallChart(context.Background(), conf, c.Config().DOConf, c.Config().ServerConf.DisablePullSecretsInjection)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error installing porter-agent")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	w.WriteHeader(http.StatusOK)
}

func checkAndDeleteOlderAgent(k8sAgent *kubernetes.Agent, helmAgent *helm.Agent) error {
	namespaceList, err := k8sAgent.Clientset.CoreV1().Namespaces().List(context.Background(), v1.ListOptions{})
	if err != nil {
		return fmt.Errorf("error listing namespaces: %w", err)
	}

	nsExists := false

	for _, namespace := range namespaceList.Items {
		if namespace.Name == "porter-agent-system" {
			nsExists = true
			break
		}
	}

	if !nsExists {
		return nil
	}

	// detect if the `porter-agent` release is installed
	helmRelease, err := helmAgent.GetRelease(context.Background(), "porter-agent", 0, false)

	if err != nil || helmRelease == nil {
		return nil
	}

	_, err = helmAgent.UninstallChart(context.Background(), "porter-agent")
	if err != nil {
		return err
	}

	return nil
}
