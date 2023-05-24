package stacks

import (
	"fmt"
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
) *GetPorterAppEventHandler {
	return &GetPorterAppEventHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
	}
}

func (p *GetPorterAppEventHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	eventID, reqErr := requestutils.GetURLParamString(r, types.URLParamStackEventID)
	if reqErr != nil {
		p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(reqErr, http.StatusBadRequest))
		return
	}

	eventIDasUUID, err := uuid.Parse(eventID)
	if err != nil {
		e := fmt.Errorf("unable to parse porter app event id as uuid: %w", err)
		p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(e, http.StatusBadRequest))
		return
	}

	if eventIDasUUID == uuid.Nil {
		e := fmt.Errorf("invalid UUID passed for porter app event id")
		p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(e, http.StatusBadRequest))
		return
	}

	event, err := p.Repo().PorterAppEvent().EventByID(eventIDasUUID)
	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}
	if event.ID == uuid.Nil {
		e := fmt.Errorf("porter app event not found")
		p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(e, http.StatusNotFound))
		return
	}

	p.WriteResult(w, r, event.ToPorterAppEvent())
}
