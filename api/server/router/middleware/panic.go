package middleware

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/shared/config"
)

type PanicMiddleware struct {
	config *config.Config
}

func NewPanicMiddleware(config *config.Config) *PanicMiddleware {
	return &PanicMiddleware{config}
}

func (pmw *PanicMiddleware) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// defer func() {
		// 	err := recover()
		// 	if err != nil {
		// 		apierrors.HandleAPIError(pmw.config.Logger, pmw.config.Alerter, w, r, apierrors.NewErrInternal(fmt.Errorf("%v", err)), true)
		// 	}
		// }()

		next.ServeHTTP(w, r)
	})
}
