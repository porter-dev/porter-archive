package stack

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

type StackListHandler struct {
	handlers.PorterHandlerWriter
}

func NewStackListHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *StackListHandler {
	return &StackListHandler{
		PorterHandlerWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
	}
}

func (p *StackListHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	proj, _ := r.Context().Value(types.ProjectScope).(*models.Project)
	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)
	namespace, _ := r.Context().Value(types.NamespaceScope).(string)

	stacks, err := p.Repo().Stack().ListStacks(proj.ID, cluster.ID, namespace)

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	res := make([]*types.Stack, 0)

	for _, stack := range stacks {
		res = append(res, stack.ToStackType())
	}

	p.WriteResult(w, r, res)
}
