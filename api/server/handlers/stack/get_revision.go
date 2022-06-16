package stack

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/requestutils"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

type StackGetRevisionHandler struct {
	handlers.PorterHandlerWriter
}

func NewStackGetRevisionHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *StackGetRevisionHandler {
	return &StackGetRevisionHandler{
		PorterHandlerWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
	}
}

func (p *StackGetRevisionHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	stack, _ := r.Context().Value(types.StackScope).(*models.Stack)

	// read the revision number from the request
	revNumber, reqErr := requestutils.GetURLParamUint(r, types.URLParamStackRevisionNumber)

	if reqErr != nil {
		p.HandleAPIError(w, r, reqErr)
		return
	}

	revision, err := p.Repo().Stack().ReadStackRevisionByNumber(stack.ID, revNumber)

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	p.WriteResult(w, r, revision.ToStackRevisionType(stack.UID))
}
