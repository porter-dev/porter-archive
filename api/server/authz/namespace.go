package authz

import (
	"context"
	"net/http"
	"strings"

	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
)

type NamespaceScopedFactory struct {
	config *config.Config
}

func NewNamespaceScopedFactory(
	config *config.Config,
) *NamespaceScopedFactory {
	return &NamespaceScopedFactory{config}
}

func (p *NamespaceScopedFactory) Middleware(next http.Handler) http.Handler {
	return &NamespaceScopedMiddleware{next, p.config}
}

type NamespaceScopedMiddleware struct {
	next   http.Handler
	config *config.Config
}

func (n *NamespaceScopedMiddleware) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// get the namespace from the URL param context
	reqScopes, _ := r.Context().Value(types.RequestScopeCtxKey).(map[types.PermissionScope]*types.RequestAction)

	namespace := reqScopes[types.NamespaceScope].Resource.Name

	if strings.ToLower(namespace) == "all" {
		namespace = ""
	}

	ctx := NewNamespaceContext(r.Context(), namespace)
	r = r.Clone(ctx)
	n.next.ServeHTTP(w, r)
}

func NewNamespaceContext(ctx context.Context, namespace string) context.Context {
	return context.WithValue(ctx, types.NamespaceScope, namespace)
}
