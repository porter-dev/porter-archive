package cluster

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"k8s.io/client-go/tools/clientcmd"
)

type GetTemporaryKubeconfigHandler struct {
	handlers.PorterHandlerWriter
	authz.KubernetesAgentGetter
}

func NewGetTemporaryKubeconfigHandler(
	config *shared.Config,
	writer shared.ResultWriter,
) *GetTemporaryKubeconfigHandler {
	return &GetTemporaryKubeconfigHandler{
		PorterHandlerWriter:   handlers.NewDefaultPorterHandler(config, nil, writer),
		KubernetesAgentGetter: authz.NewOutOfClusterAgentGetter(config),
	}
}

func (c *GetTemporaryKubeconfigHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)

	outOfClusterConfig := c.GetOutOfClusterConfig(cluster)

	kubeconfig, err := outOfClusterConfig.CreateRawConfigFromCluster()

	if err != nil {
		c.HandleAPIError(w, apierrors.NewErrInternal(err))
		return
	}

	kubeconfigBytes, err := clientcmd.Write(*kubeconfig)

	if err != nil {
		c.HandleAPIError(w, apierrors.NewErrInternal(err))
		return
	}

	res := &types.GetTemporaryKubeconfigResponse{
		Kubeconfig: kubeconfigBytes,
	}

	c.WriteResult(w, res)
}
