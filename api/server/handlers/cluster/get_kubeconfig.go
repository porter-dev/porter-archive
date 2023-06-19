package cluster

import (
	"encoding/base64"
	"net/http"

	"github.com/bufbuild/connect-go"
	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"
	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/telemetry"
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
	ctx, span := telemetry.NewSpan(r.Context(), "serve-get-temporary-kubeconfig")
	defer span.End()

	if c.Config().ServerConf.DisableTemporaryKubeconfig {
		e := telemetry.Error(ctx, span, nil, "temporary kubeconfig generation is disabled on this instance")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(e, http.StatusNotFound))
		return
	}

	cluster, _ := ctx.Value(types.ClusterScope).(*models.Cluster)

	outOfClusterConfig := c.GetOutOfClusterConfig(cluster)

	if cluster.ProvisionedBy == "CAPI" {
		kubeconfigResp, err := c.Config().ClusterControlPlaneClient.KubeConfigForCluster(ctx, connect.NewRequest(
			&porterv1.KubeConfigForClusterRequest{
				ProjectId: int64(cluster.ProjectID),
				ClusterId: int64(cluster.ID),
			},
		))
		if err != nil {
			e := telemetry.Error(ctx, span, err, "error getting temporary capi config")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(e, http.StatusInternalServerError))
			return
		}
		if kubeconfigResp.Msg == nil {
			e := telemetry.Error(ctx, span, err, "error reading temporary capi config")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(e, http.StatusInternalServerError))
			return
		}
		b64, err := base64.StdEncoding.DecodeString(kubeconfigResp.Msg.KubeConfig)
		if err != nil {
			e := telemetry.Error(ctx, span, err, "unable to decode base64 kubeconfig")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(e, http.StatusInternalServerError))
			return
		}
		res := &types.GetTemporaryKubeconfigResponse{
			Kubeconfig: b64,
		}
		c.WriteResult(w, r, res)
		return
	}

	kubeconfig, err := outOfClusterConfig.CreateRawConfigFromCluster(ctx)
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
