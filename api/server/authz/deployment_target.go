package authz

import (
	"context"
	"errors"
	"fmt"
	"net/http"

	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"gorm.io/gorm"
)

// DeploymentTargetScopedFactory is a factory for generating deployment target middleware
type DeploymentTargetScopedFactory struct {
	config *config.Config
}

// NewDeploymentTargetScopedFactory returns a new DeploymentTargetScopedFactory
func NewDeploymentTargetScopedFactory(
	config *config.Config,
) *DeploymentTargetScopedFactory {
	return &DeploymentTargetScopedFactory{config}
}

// Middleware checks that the request is scoped to a deployment target
func (p *DeploymentTargetScopedFactory) Middleware(next http.Handler) http.Handler {
	return &DeploymentTargetScopedMiddleware{next, p.config}
}

// DeploymentTargetScopedMiddleware checks that the request is scoped to a deployment target
type DeploymentTargetScopedMiddleware struct {
	next   http.Handler
	config *config.Config
}

// ServeHTTP checks that the request is scoped to a deployment target
func (p *DeploymentTargetScopedMiddleware) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// read the project to check scopes
	proj, _ := r.Context().Value(types.ProjectScope).(*models.Project)

	// get the deployment target identifier from the URL param context
	reqScopes, _ := r.Context().Value(types.RequestScopeCtxKey).(map[types.PermissionScope]*types.RequestAction)
	deploymentTargetIdentifier := reqScopes[types.DeploymentTargetScope].Resource.Name

	deploymentTargetDB, err := p.config.Repo.DeploymentTarget().DeploymentTarget(proj.ID, deploymentTargetIdentifier)
	if err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			apierrors.HandleAPIError(p.config.Logger, p.config.Alerter, w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError), true)
			return
		}
		err := fmt.Errorf("deployment target with identifier %s not found in project %d", deploymentTargetIdentifier, proj.ID)
		apierrors.HandleAPIError(p.config.Logger, p.config.Alerter, w, r, apierrors.NewErrPassThroughToClient(err, http.StatusForbidden), true)
		return
	}

	deploymentTarget := types.DeploymentTarget{
		ID:           deploymentTargetDB.ID,
		ProjectID:    uint(deploymentTargetDB.ProjectID),
		ClusterID:    uint(deploymentTargetDB.ClusterID),
		Name:         deploymentTargetDB.VanityName,
		Namespace:    deploymentTargetDB.Selector,
		IsPreview:    deploymentTargetDB.Preview,
		IsDefault:    deploymentTargetDB.IsDefault,
		CreatedAtUTC: deploymentTargetDB.CreatedAt.UTC(),
		UpdatedAtUTC: deploymentTargetDB.UpdatedAt.UTC(),
	}

	ctx := NewDeploymentTargetContext(r.Context(), deploymentTarget)
	r = r.Clone(ctx)
	p.next.ServeHTTP(w, r)
}

// NewDeploymentTargetContext returns a new context with the deployment target
func NewDeploymentTargetContext(ctx context.Context, deploymentTarget types.DeploymentTarget) context.Context {
	return context.WithValue(ctx, types.DeploymentTargetScope, deploymentTarget)
}
