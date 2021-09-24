package middleware

import (
	"context"
	"errors"
	"net/http"

	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/websocket"
	"github.com/porter-dev/porter/api/types"
)

type WebsocketMiddleware struct {
	config *config.Config
}

func NewWebsocketMiddleware(config *config.Config) *WebsocketMiddleware {
	return &WebsocketMiddleware{config}
}

func (wm *WebsocketMiddleware) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		conn, newRW, safeRW, err := wm.config.WSUpgrader.Upgrade(w, r, nil)

		if err != nil {
			if errors.Is(err, websocket.UpgraderCheckOriginErr) {
				apierrors.HandleAPIError(wm.config, w, r, apierrors.NewErrForbidden(err), true)
				return
			} else {
				apierrors.HandleAPIError(wm.config, w, r, apierrors.NewErrInternal(err), false)
				return
			}
		}

		w = newRW
		defer conn.Close()

		ctx := r.Context()
		ctx = context.WithValue(ctx, types.RequestCtxWebsocketKey, safeRW)

		r = r.Clone(ctx)
		next.ServeHTTP(w, r)
	})
}
