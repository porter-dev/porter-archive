package stack

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

type StackDeleteHandler struct {
	handlers.PorterHandlerWriter
	authz.KubernetesAgentGetter
}

func NewStackDeleteHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *StackDeleteHandler {
	return &StackDeleteHandler{
		PorterHandlerWriter:   handlers.NewDefaultPorterHandler(config, nil, writer),
		KubernetesAgentGetter: authz.NewOutOfClusterAgentGetter(config),
	}
}

func (p *StackDeleteHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	stack, _ := r.Context().Value(types.StackScope).(*models.Stack)
	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)
	namespace, _ := r.Context().Value(types.NamespaceScope).(string)

	revision, err := p.Repo().Stack().ReadStackRevisionByNumber(stack.ID, stack.Revisions[0].ID)

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	helmAgent, err := p.GetHelmAgent(r, cluster, namespace)

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	// delete all resources in stack
	for _, appResource := range revision.Resources {
		deleteAppResource(&deleteAppResourceOpts{
			helmAgent: helmAgent,
			name:      appResource.Name,
		})
	}

	stack, err = p.Repo().Stack().DeleteStack(stack)

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}
}
