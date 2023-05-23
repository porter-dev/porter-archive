package stacks

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
)

type PorterAppEventListHandler struct {
	handlers.PorterHandlerWriter
}

func NewPorterAppEventListHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *PorterAppListHandler {
	return &PorterAppListHandler{
		PorterHandlerWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
	}
}

func (p *PorterAppEventListHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// ctx := r.Context()
	stackID := uint(0)
	porterApps, err := p.Repo().PorterAppEvent().ListEventsByPorterAppID(stackID)
	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	res := struct {
		Events []types.PorterAppEvent `json:"events"`
	}{}

	for _, porterApp := range porterApps {
		res.Events = append(res.Events, porterApp.ToPorterAppEvent())
	}
	p.WriteResult(w, r, res)
}
