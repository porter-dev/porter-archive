package cluster

import (
	"errors"
	"net/http"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"k8s.io/client-go/tools/clientcmd"
)

type GetTemporaryKubeconfigHandler struct {
	handlers.PorterHandlerWriter
	authz.KubernetesAgentGetter
}

func NewGetTemporaryKubeconfigHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *GetTemporaryKubeconfigHandler {
	return &GetTemporaryKubeconfigHandler{
		PorterHandlerWriter:   handlers.NewDefaultPorterHandler(config, nil, writer),
		KubernetesAgentGetter: authz.NewOutOfClusterAgentGetter(config),
	}
}

func (c *GetTemporaryKubeconfigHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if c.Config().ServerConf.DisableTemporaryKubeconfig {
		c.HandleAPIError(w, r, apierrors.NewErrNotFound(
			errors.New("temporary kubeconfig generation is disabled on this instance"),
		))
		return
	}
	ctx := r.Context()

	cluster, _ := ctx.Value(types.ClusterScope).(*models.Cluster)

	outOfClusterConfig := c.GetOutOfClusterConfig(cluster)
	//
	//if cluster.ProvisionedBy == "CAPI" {
	//	kubeconfigResp, err := c.Config().ClusterControlPlaneClient.KubeConfigForCluster(context.Background(), connect.NewRequest(
	//		&porterv1.KubeConfigForClusterRequest{
	//			ProjectId: int64(cluster.ProjectID),
	//			ClusterId: int64(cluster.ID),
	//		},
	//	))
	//	if err != nil {
	//		c.HandleAPIError(w, r, apierrors.NewErrInternal(fmt.Errorf("error getting temporary capi config: %w", err)))
	//		return
	//	}
	//	if kubeconfigResp.Msg == nil {
	//		c.HandleAPIError(w, r, apierrors.NewErrInternal(fmt.Errorf("error reading temporary capi config: %w", err)))
	//		return
	//	}
	//	b64, err := base64.StdEncoding.DecodeString(kubeconfigResp.Msg.KubeConfig)
	//	if err != nil {
	//		c.HandleAPIError(w, r, apierrors.NewErrInternal(fmt.Errorf("unable to decode base64 kubeconfig: %w", err)))
	//		return
	//	}
	//	res := &types.GetTemporaryKubeconfigResponse{
	//		Kubeconfig: b64,
	//	}
	//	c.WriteResult(w, r, res)
	//	return
	//}

	kubeconfig, err := outOfClusterConfig.CreateRawConfigFromCluster()
	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	kubeconfigBytes, err := clientcmd.Write(*kubeconfig)
	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	res := &types.GetTemporaryKubeconfigResponse{
		Kubeconfig: kubeconfigBytes,
	}

	c.WriteResult(w, r, res)
}
