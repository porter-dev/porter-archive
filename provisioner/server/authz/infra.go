package authz

import (
	"context"
	"fmt"
	"net/http"

	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/requestutils"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/provisioner/server/config"
	"gorm.io/gorm"
)

type InfraScopedFactory struct {
	config *config.Config
}

func NewInfraScopedFactory(
	config *config.Config,
) *InfraScopedFactory {
	return &InfraScopedFactory{config}
}

func (p *InfraScopedFactory) Middleware(next http.Handler) http.Handler {
	return &InfraScopedMiddleware{next, p.config}
}

type InfraScopedMiddleware struct {
	next   http.Handler
	config *config.Config
}

func (p *InfraScopedMiddleware) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	proj, _ := r.Context().Value(types.ProjectScope).(*models.Project)
	infraID, reqErr := requestutils.GetURLParamUint(r, types.URLParam("infra_id"))

	if reqErr != nil {
		apierrors.HandleAPIError(
			p.config.Logger,
			p.config.Alerter, w, r,
			apierrors.NewErrForbidden(
				fmt.Errorf("could not get infra id: %s", reqErr.Error()),
			),
			true,
		)

		return
	}

	// look for infra with that ID and project ID
	infra, err := p.config.Repo.Infra().ReadInfra(proj.ID, infraID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			apierrors.HandleAPIError(
				p.config.Logger,
				p.config.Alerter, w, r,
				apierrors.NewErrForbidden(
					fmt.Errorf("could not read infra id %d in project %d", infraID, proj.ID),
				),
				true,
			)
		} else {
			apierrors.HandleAPIError(p.config.Logger, p.config.Alerter, w, r, apierrors.NewErrInternal(err), true)
		}

		return
	}

	ctx := NewInfraContext(r.Context(), infra)
	r = r.Clone(ctx)
	p.next.ServeHTTP(w, r)
}

func NewInfraContext(ctx context.Context, infra *models.Infra) context.Context {
	return context.WithValue(ctx, types.InfraScope, infra)
}
