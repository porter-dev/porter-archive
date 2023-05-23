package stacks

import (
	"net/http"

	"github.com/google/uuid"
	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/requestutils"
	"github.com/porter-dev/porter/api/types"
)

type GetPorterAppEventHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

func NewGetPorterAppEventHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *GetPorterAppHandler {
	return &GetPorterAppHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
	}
}

func (p *GetPorterAppEventHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	eventID, reqErr := requestutils.GetURLParamString(r, types.URLParamStackID)
	if reqErr != nil {
		p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(reqErr, http.StatusBadRequest))
		return
	}

	eventIDasUUID, err := uuid.Parse(eventID)
	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	event, err := p.Repo().PorterAppEvent().EventByID(eventIDasUUID)
	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	p.WriteResult(w, r, event.ToPorterAppEvent())
}
