package middleware

import (
	"fmt"
	"net/http"

	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/usage"
)

type UsageMiddleware struct {
	config *config.Config
	metric types.UsageMetric
}

func NewUsageMiddleware(config *config.Config, metric types.UsageMetric) *UsageMiddleware {
	return &UsageMiddleware{config, metric}
}

var UsageErrFmt = "usage limit reached for metric %s: limit %d, requested %d"

func (b *UsageMiddleware) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		proj, _ := r.Context().Value(types.ProjectScope).(*models.Project)

		// get the project usage limits
		currentUsage, limit, _, err := usage.GetUsage(&usage.GetUsageOpts{
			Project: proj,
			DOConf:  b.config.DOConf,
			Repo:    b.config.Repo,
		})

		if err != nil {
			apierrors.HandleAPIError(
				b.config,
				w, r,
				apierrors.NewErrInternal(err),
				true,
			)

			return
		}

		// check the usage limits
		allowed := allowUsage(limit, currentUsage, b.metric)

		if allowed {
			next.ServeHTTP(w, r)
		} else {
			limit, curr := getMetricUsage(limit, currentUsage, b.metric)

			apierrors.HandleAPIError(
				b.config,
				w, r,
				apierrors.NewErrPassThroughToClient(
					fmt.Errorf(UsageErrFmt, b.metric, limit, curr),
					http.StatusBadRequest,
				),
				true,
			)
		}
	})
}

// checkUsage returns true if the increase in usage is allowed for the given metric,
// false otherwise. We only assume increments of 1 in usage for now.
func allowUsage(
	plan, current *types.ProjectUsage,
	metric types.UsageMetric,
) bool {
	switch metric {
	case types.Users:
		return plan.Users > current.Users+1
	case types.Clusters:
		return plan.Clusters > current.Clusters+1
	default:
		return false
	}
}

func getMetricUsage(
	plan, current *types.ProjectUsage,
	metric types.UsageMetric,
) (limit uint, curr uint) {
	switch metric {
	case types.CPU:
		return plan.ResourceCPU, current.ResourceCPU
	case types.Memory:
		return plan.ResourceMemory, current.ResourceMemory
	case types.Users:
		return plan.Users, current.Users
	case types.Clusters:
		return plan.Users, current.Users
	default:
		return 0, 0
	}
}
