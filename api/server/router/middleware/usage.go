package middleware

import (
	"net/http"

	"github.com/porter-dev/porter/internal/telemetry"

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
		ctx, span := telemetry.NewSpan(r.Context(), "middleware-usage")
		defer span.End()

		proj, _ := ctx.Value(types.ProjectScope).(*models.Project)

		telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "project-id", Value: proj.ID})

		// get the project usage limits
		currentUsage, limit, _, err := usage.GetUsage(&usage.GetUsageOpts{
			Project:                          proj,
			DOConf:                           b.config.DOConf,
			Repo:                             b.config.Repo,
			WhitelistedUsers:                 b.config.WhitelistedUsers,
			ClusterControlPlaneServiceClient: b.config.ClusterControlPlaneClient,
		})
		if err != nil {
			err = telemetry.Error(ctx, span, err, "error getting usage")

			apierrors.HandleAPIError(
				b.config.Logger,
				b.config.Alerter,
				w, r,
				apierrors.NewErrInternal(err),
				true,
			)

			return
		}

		telemetry.WithAttributes(span,
			telemetry.AttributeKV{Key: "users-current-usage", Value: currentUsage.Users},
			telemetry.AttributeKV{Key: "users-limit", Value: limit.Users},
			telemetry.AttributeKV{Key: "cpu-current-usage", Value: currentUsage.ResourceCPU},
			telemetry.AttributeKV{Key: "cpu-limit", Value: limit.ResourceCPU},
			telemetry.AttributeKV{Key: "memory-current-usage", Value: currentUsage.ResourceMemory},
			telemetry.AttributeKV{Key: "memory-limit", Value: limit.ResourceMemory},
			telemetry.AttributeKV{Key: "clusters-current-usage", Value: currentUsage.Clusters},
			telemetry.AttributeKV{Key: "clusters-limit", Value: limit.Clusters},
		)

		// check the usage limits
		allowed := allowUsage(limit, currentUsage, b.metric)

		telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "allowed", Value: allowed})

		r = r.Clone(ctx)

		next.ServeHTTP(w, r)
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
		return plan.Users == 0 || plan.Users >= current.Users+1
	case types.Clusters:
		return plan.Clusters == 0 || plan.Clusters >= current.Clusters+1
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
		return plan.Clusters, current.Clusters
	default:
		return 0, 0
	}
}
