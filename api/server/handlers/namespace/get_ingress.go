package namespace

import (
	"errors"
	"fmt"
	"net/http"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/requestutils"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/kubernetes"
	"github.com/porter-dev/porter/internal/models"
)

type GetIngressHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

func NewGetIngressHandler(
	config *config.Config,
	resultWriter shared.ResultWriter,
) *GetIngressHandler {
	return &GetIngressHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, nil, resultWriter),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

func (c *GetIngressHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)
	name, _ := requestutils.GetURLParamString(r, types.URLParamIngressName)
	namespace, _ := requestutils.GetURLParamString(r, types.URLParamNamespace)

	agent, err := c.GetAgent(r, cluster, "")

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	ingress1, err := agent.GetExtensionsV1Beta1Ingress(namespace, name)

	if err == nil && ingress1 != nil {
		c.WriteResult(w, r, ingress1)
		return
	}

	ingress2, err := agent.GetNetworkingV1Beta1Ingress(namespace, name)

	if err == nil && ingress2 != nil {
		c.WriteResult(w, r, ingress2)
		return
	}

	ingress3, err := agent.GetNetworkingV1Ingress(namespace, name)

	if err == nil && ingress3 != nil {
		c.WriteResult(w, r, ingress3)
		return
	}

	ingress4, err := agent.GetIstioIngress(namespace, name)

	if errors.Is(err, kubernetes.IsNotFoundError) {
		c.HandleAPIError(w, r, apierrors.NewErrNotFound(fmt.Errorf("ingress %s/%s was not found", namespace, name)))
		return
	} else if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	c.WriteResult(w, r, ingress4)
}
