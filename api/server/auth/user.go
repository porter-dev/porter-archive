package auth

import (
	"context"
	"net/http"

	"github.com/porter-dev/porter/api/types"
)

func NewUserContext(ctx context.Context, user types.User) context.Context {
	return context.WithValue(ctx, types.UserScope, user)
}

func UserScoped(h http.Handler, w http.ResponseWriter, r *http.Request) {
	// find the user based on the request header

	// create a new user-scoped context
}
