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
	// TODO: remove this
	if p.config.ProvisionerConf.Debug {
		ctx := NewInfraContext(r.Context(), &models.Infra{
			Model: gorm.Model{
				ID: 1,
			},
			Kind:      "test",
			Suffix:    "123456",
			ProjectID: 1,
		})
		r = r.Clone(ctx)
		p.next.ServeHTTP(w, r)
		return
	}

	workspaceID, reqErr := requestutils.GetURLParamString(r, types.URLParam("workspace_id"))

	if reqErr != nil {
		apierrors.HandleAPIError(
			p.config.Logger,
			p.config.Alerter, w, r,
			apierrors.NewErrForbidden(
				fmt.Errorf("could not get workspace id: %s", reqErr.Error()),
			),
			true,
		)

		return
	}

	_, projID, infraID, _, err := models.ParseUniqueName(workspaceID)

	if err != nil {
		apierrors.HandleAPIError(
			p.config.Logger,
			p.config.Alerter, w, r,
			apierrors.NewErrForbidden(
				fmt.Errorf("could not parse workspace id: %v", err),
			),
			true,
		)

		return
	}

	// look for infra with that ID and project ID
	infra, err := p.config.Repo.Infra().ReadInfra(projID, infraID)

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			apierrors.HandleAPIError(
				p.config.Logger,
				p.config.Alerter, w, r,
				apierrors.NewErrForbidden(
					fmt.Errorf("could not read infra id %d in project %d", infraID, projID),
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
