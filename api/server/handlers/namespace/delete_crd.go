package namespace

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/templater/dynamic"
)

type CRDDeleteHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

func NewCRDDeleteHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *CRDDeleteHandler {
	return &CRDDeleteHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

func (c *CRDDeleteHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)
	client, err := c.GetDynamicClient(r, cluster)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	request := &types.DeleteCRDRequest{}

	if ok := c.DecodeAndValidate(w, r, request); !ok {
		return
	}

	crdWriter := dynamic.NewDynamicTemplateWriter(client, &dynamic.Object{
		Group:     request.Group,
		Version:   request.Version,
		Resource:  request.Resource,
		Namespace: request.Namespace,
		Name:      request.Name,
	}, map[string]interface{}{})

	err = crdWriter.Delete()

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	w.WriteHeader(http.StatusOK)
}
