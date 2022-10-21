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
	"github.com/porter-dev/porter/internal/auth/token"
	"github.com/porter-dev/porter/internal/helm"
	"github.com/porter-dev/porter/internal/helm/loader"
	"github.com/porter-dev/porter/internal/models"
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
	proj, _ := r.Context().Value(types.ProjectScope).(*models.Project)
	user, _ := r.Context().Value(types.UserScope).(*models.User)
	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)
	helmAgent, err := c.GetHelmAgent(r, cluster, "porter-agent-system")

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	chart, err := loader.LoadChartPublic(c.Config().ServerConf.DefaultAddonHelmRepoURL, "porter-agent", "")

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	// create namespace if not exists
	_, err = helmAgent.K8sAgent.CreateNamespace("porter-agent-system")

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	// add api token to values
	jwt, err := token.GetTokenForAPI(user.ID, proj.ID)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	encoded, err := jwt.EncodeToken(c.Config().TokenConf)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	porterAgentValues := map[string]interface{}{
		"agent": map[string]interface{}{
			"image":       "public.ecr.aws/o1j4x7p4/porter-agent:latest",
			"porterHost":  c.Config().ServerConf.ServerURL,
			"porterPort":  "443",
			"porterToken": encoded,
			"privateRegistry": map[string]interface{}{
				"enabled": false,
			},
			"clusterID": fmt.Sprintf("%d", cluster.ID),
			"projectID": fmt.Sprintf("%d", proj.ID),
		},
	}

	conf := &helm.InstallChartConfig{
		Chart:     chart,
		Name:      "porter-agent",
		Namespace: "porter-agent-system",
		Cluster:   cluster,
		Repo:      c.Repo(),
		Values:    porterAgentValues,
	}

	_, err = helmAgent.InstallChart(conf, c.Config().DOConf, c.Config().ServerConf.DisablePullSecretsInjection)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(
			fmt.Errorf("error installing a new chart: %s", err.Error()),
			http.StatusBadRequest,
		))

		return
	}

	w.WriteHeader(http.StatusOK)
}
