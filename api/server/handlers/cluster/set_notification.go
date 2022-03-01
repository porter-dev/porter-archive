package cluster

import (
	"fmt"
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/notifications"
)

type SetNotificationHandler struct {
	*notifications.NotificationsManager
	handlers.PorterHandlerReadWriter
}

func NewSetNotificationHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *SetNotificationHandler {
	return &SetNotificationHandler{
		NotificationsManager:    notifications.NewNotificationsManager(config),
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (c *SetNotificationHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	request := &types.SetNotificationRequest{}

	if ok := c.DecodeAndValidate(w, r, request); !ok {
		return
	}

	backends := c.GetBackends()

	for _, backendReq := range request.Backends {
		if _, ok := backends[backendReq.Name]; !ok {
			c.HandleAPIError(w, r, apierrors.NewErrInternal(fmt.Errorf("no such notification backend: %s", backendReq.Name)))
			return
		}

		backend := backends[backendReq.Name]

		err := backend.Apply(r, backendReq.Actions)

		if err != nil {
			c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}
	}
}
