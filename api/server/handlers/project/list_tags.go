package project

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

type GetTagsHandler struct {
	handlers.PorterHandlerWriter
}

func NewGetTagsHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *GetTagsHandler {
	return &GetTagsHandler{
		PorterHandlerWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
	}
}

func (p *GetTagsHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	proj, _ := r.Context().Value(types.ProjectScope).(*models.Project)
	tags, err := p.Repo().Tag().ListTagsByProjectId(proj.ID)

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
	}

	p.WriteResult(w, r, tags)
}
