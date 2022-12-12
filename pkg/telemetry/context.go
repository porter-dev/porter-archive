package telemetry

import (
	"context"

	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

// UserFromContext returns a User model if present on the context
func UserFromContext(ctx context.Context) (models.User, bool) {
	if userVal := ctx.Value(types.UserScope); userVal != nil {
		if userModel, ok := userVal.(*models.User); ok {
			return *userModel, ok
		}
	}
	return models.User{}, false
}
