package authz

import (
	"context"
	"errors"
	"fmt"
	"net/http"

	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/requestutils"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/provisioner/server/config"
	"gorm.io/gorm"
)

type WorkspaceScopedFactory struct {
	config *config.Config
}

func NewWorkspaceScopedFactory(
	config *config.Config,
) *WorkspaceScopedFactory {
	return &WorkspaceScopedFactory{config}
}

func (p *WorkspaceScopedFactory) Middleware(next http.Handler) http.Handler {
	return &WorkspaceScopedMiddleware{next, p.config}
}

type WorkspaceScopedMiddleware struct {
	next   http.Handler
	config *config.Config
}

func (p *WorkspaceScopedMiddleware) ServeHTTP(w http.ResponseWriter, r *http.Request) {
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

	name, err := models.ParseWorkspaceID(workspaceID)
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

	// if a CE token is attached, make sure it matches the project ID
	if ceToken, ok := r.Context().Value("ce_token").(*models.CredentialsExchangeToken); ok {
		if ceToken.ProjectID != name.ProjectID {
			apierrors.HandleAPIError(
				p.config.Logger,
				p.config.Alerter, w, r,
				apierrors.NewErrForbidden(
					fmt.Errorf("credential exchange token project ID does not match requested project ID"),
				),
				true,
			)

			return
		}
	}

	// look for infra with that ID and project ID
	infra, err := p.config.Repo.Infra().ReadInfra(name.ProjectID, name.InfraID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			apierrors.HandleAPIError(
				p.config.Logger,
				p.config.Alerter, w, r,
				apierrors.NewErrForbidden(
					fmt.Errorf("could not read infra id %d in project %d", name.InfraID, name.ProjectID),
				),
				true,
			)
		} else {
			apierrors.HandleAPIError(p.config.Logger, p.config.Alerter, w, r, apierrors.NewErrInternal(err), true)
		}

		return
	}

	// look for matching operation for the infra
	operation, err := p.config.Repo.Infra().ReadOperation(infra.ID, name.OperationUID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			apierrors.HandleAPIError(p.config.Logger, p.config.Alerter, w, r, apierrors.NewErrForbidden(err), true)
			return
		}

		apierrors.HandleAPIError(p.config.Logger, p.config.Alerter, w, r, apierrors.NewErrInternal(err), true)
		return
	}

	ctx := NewInfraContext(r.Context(), infra)
	ctx = NewOperationContext(ctx, operation)
	r = r.Clone(ctx)
	p.next.ServeHTTP(w, r)
}

func NewOperationContext(ctx context.Context, operation *models.Operation) context.Context {
	return context.WithValue(ctx, types.OperationScope, operation)
}
