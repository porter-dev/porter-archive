package authz

import (
	"context"
	"fmt"
	"net/http"

	"github.com/porter-dev/porter/api/server/authz/policy"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/requestutils"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

type PolicyMiddleware struct {
	config       *config.Config
	endpointMeta types.APIRequestMetadata
	loader       policy.PolicyDocumentLoader
}

func NewPolicyMiddleware(
	config *config.Config,
	endpointMeta types.APIRequestMetadata,
	loader policy.PolicyDocumentLoader,
) *PolicyMiddleware {
	return &PolicyMiddleware{config, endpointMeta, loader}
}

func (p *PolicyMiddleware) Middleware(next http.Handler) http.Handler {
	return &PolicyHandler{next, p.config, p.endpointMeta, p.loader}
}

type PolicyHandler struct {
	next         http.Handler
	config       *config.Config
	endpointMeta types.APIRequestMetadata
	loader       policy.PolicyDocumentLoader
}

func (h *PolicyHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// get the full map of scopes to resource actions
	reqScopes, reqErr := getRequestActionForEndpoint(r, h.endpointMeta)

	if reqErr != nil {
		apierrors.HandleAPIError(h.config.Logger, h.config.Alerter, w, r, reqErr, true)
		return
	}

	policyLoaderOpts := &policy.PolicyLoaderOpts{}

	// first check if an api token exists in context
	if r.Context().Value("api_token") != nil {
		projID := reqScopes[types.ProjectScope].Resource.UInt

		// FIXME: find a clean way to get the project

		apiToken, _ := r.Context().Value("api_token").(*models.APIToken)
		policyLoaderOpts.ProjectToken = apiToken
		policyLoaderOpts.ProjectID = projID
	} else {
		projID := reqScopes[types.ProjectScope].Resource.UInt
		user, _ := r.Context().Value(types.UserScope).(*models.User)

		policyLoaderOpts.ProjectID = projID
		policyLoaderOpts.UserID = user.ID
	}

	// load policy documents for the user + project
	policyDocs, reqErr := h.loader.LoadPolicyDocuments(policyLoaderOpts)

	if reqErr != nil {
		apierrors.HandleAPIError(h.config.Logger, h.config.Alerter, w, r, reqErr, true)
		return
	}

	// validate that the policy permits the action
	hasAccess := policy.HasScopeAccess(policyDocs, reqScopes)

	if !hasAccess {
		apierrors.HandleAPIError(
			h.config.Logger,
			h.config.Alerter,
			w,
			r,
			apierrors.NewErrForbidden(fmt.Errorf("policy forbids action in project %d", policyLoaderOpts.ProjectID)),
			true,
		)

		return
	}

	// add the set of resource ids to the request context
	ctx := NewRequestScopeCtx(r.Context(), reqScopes)
	r = r.Clone(ctx)
	h.next.ServeHTTP(w, r)
}

func NewRequestScopeCtx(ctx context.Context, reqScopes map[types.PermissionScope]*types.RequestAction) context.Context {
	return context.WithValue(ctx, types.RequestScopeCtxKey, reqScopes)
}

func getRequestActionForEndpoint(
	r *http.Request,
	endpointMeta types.APIRequestMetadata,
) (res map[types.PermissionScope]*types.RequestAction, reqErr apierrors.RequestError) {
	res = make(map[types.PermissionScope]*types.RequestAction)

	// iterate through scopes, attach policies as needed
	for _, scope := range endpointMeta.Scopes {
		// find the resource ID and create the resource
		resource := types.NameOrUInt{}

		switch scope {
		case types.ProjectScope:
			resource.UInt, reqErr = requestutils.GetURLParamUint(r, types.URLParamProjectID)
		case types.ClusterScope:
			resource.UInt, reqErr = requestutils.GetURLParamUint(r, types.URLParamClusterID)
		case types.RegistryScope:
			resource.UInt, reqErr = requestutils.GetURLParamUint(r, types.URLParamRegistryID)
		case types.HelmRepoScope:
			resource.UInt, reqErr = requestutils.GetURLParamUint(r, types.URLParamHelmRepoID)
		case types.GitInstallationScope:
			resource.UInt, reqErr = requestutils.GetURLParamUint(r, types.URLParamGitInstallationID)
		case types.InfraScope:
			resource.UInt, reqErr = requestutils.GetURLParamUint(r, types.URLParamInfraID)
		case types.OperationScope:
			resource.Name, reqErr = requestutils.GetURLParamString(r, types.URLParamOperationID)
		case types.NamespaceScope:
			resource.Name, reqErr = requestutils.GetURLParamString(r, types.URLParamNamespace)
		case types.ReleaseScope:
			resource.Name, reqErr = requestutils.GetURLParamString(r, types.URLParamReleaseName)
		case types.InviteScope:
			resource.UInt, reqErr = requestutils.GetURLParamUint(r, types.URLParamInviteID)
		case types.GitlabIntegrationScope:
			resource.UInt, reqErr = requestutils.GetURLParamUint(r, types.URLParamIntegrationID)
		}

		if reqErr != nil {
			return nil, reqErr
		}

		res[scope] = &types.RequestAction{
			Verb:     endpointMeta.Verb,
			Resource: resource,
		}
	}

	return res, nil
}
