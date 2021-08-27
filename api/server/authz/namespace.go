package authz

import (
	"context"
	"net/http"

	"github.com/porter-dev/porter/api/server/authz/policy"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/types"
)

type NamespaceScopedFactory struct {
	config *shared.Config
}

func NewNamespaceScopedFactory(
	config *shared.Config,
) *NamespaceScopedFactory {
	return &NamespaceScopedFactory{config}
}

func (p *NamespaceScopedFactory) Middleware(next http.Handler) http.Handler {
	return &NamespaceScopedMiddleware{next, p.config}
}

type NamespaceScopedMiddleware struct {
	next   http.Handler
	config *shared.Config
}

func (n *NamespaceScopedMiddleware) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// get the namespace from the URL param context
	reqScopes, _ := r.Context().Value(RequestScopeCtxKey).(map[types.PermissionScope]*policy.RequestAction)

	namespace := reqScopes[types.NamespaceScope].Resource.Name

	ctx := NewNamespaceContext(r.Context(), namespace)
	r = r.WithContext(ctx)
	n.next.ServeHTTP(w, r)
}

func NewNamespaceContext(ctx context.Context, namespace string) context.Context {
	return context.WithValue(ctx, types.NamespaceScope, namespace)
}
