package project

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/usage"
)

type ProjectGetUsageHandler struct {
	handlers.PorterHandlerWriter
}

func NewProjectGetUsageHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *ProjectGetUsageHandler {
	return &ProjectGetUsageHandler{
		PorterHandlerWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
	}
}

func (p *ProjectGetUsageHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	proj, _ := r.Context().Value(types.ProjectScope).(*models.Project)

	res := &types.GetProjectUsageResponse{}

	currUsage, limit, err := usage.GetUsage(p.Config(), proj)

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	res.Current = *currUsage
	res.Limit = *limit

	p.WriteResult(w, r, res)
}
