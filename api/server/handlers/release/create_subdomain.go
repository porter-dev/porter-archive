package release

import (
	"fmt"
	"net/http"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/requestutils"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/kubernetes/domain"
	"github.com/porter-dev/porter/internal/models"
)

type CreateSubdomainHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

func NewCreateSubdomainHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *CreateSubdomainHandler {
	return &CreateSubdomainHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

func (c *CreateSubdomainHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	name, _ := requestutils.GetURLParamString(r, types.URLParamReleaseName)
	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)

	agent, err := c.GetAgent(r, cluster)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	endpoint, found, err := domain.GetNGINXIngressServiceIP(agent.Clientset)

	if !found {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(
			fmt.Errorf("target cluster does not have nginx ingress"),
		))
		return
	}

	createDomain := domain.CreateDNSRecordConfig{
		ReleaseName: name,
		RootDomain:  c.Config().ServerConf.AppRootDomain,
		Endpoint:    endpoint,
	}

	record := createDomain.NewDNSRecordForEndpoint()

	record, err = c.Repo().DNSRecord().CreateDNSRecord(record)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	_record := domain.DNSRecord(*record)

	err = _record.CreateDomain(c.Config().IngressAgent.Clientset)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	c.WriteResult(w, r, record.Externalize())
}
