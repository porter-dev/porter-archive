package authz_test

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/authz/policy"
	"github.com/porter-dev/porter/api/server/handlers/project"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/apitest"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/stretchr/testify/assert"
)

func TestPolicyMiddlewareSuccessfulProjectCluster(t *testing.T) {
	config, handler, next := loadHandlers(t, types.APIRequestMetadata{
		Verb:   types.APIVerbCreate,
		Method: types.HTTPVerbPost,
		Scopes: []types.PermissionScope{
			types.ProjectScope,
			types.ClusterScope,
		},
	}, false, false)

	user := apitest.CreateTestUser(t, config, true)
	_, _, err := project.CreateProjectWithUser(config.Repo.Project(), &models.Project{
		Name: "test-project",
	}, user)

	if err != nil {
		t.Fatal(err)
	}

	req, rr := apitest.GetRequestAndRecorder(t, string(types.HTTPVerbPost), "/api/projects/1/clusters/1", nil)

	req = apitest.WithURLParams(t, req, map[string]string{
		"project_id": "1",
		"cluster_id": "1",
	})

	req = apitest.WithAuthenticatedUser(t, req, user)

	handler.ServeHTTP(rr, req)

	assertNextHandlerCalled(t, next, rr, map[types.PermissionScope]*types.RequestAction{
		types.ProjectScope: {
			Verb: types.APIVerbCreate,
			Resource: types.NameOrUInt{
				UInt: 1,
			},
		},
		types.ClusterScope: {
			Verb: types.APIVerbCreate,
			Resource: types.NameOrUInt{
				UInt: 1,
			},
		},
	})
}

func TestPolicyMiddlewareSuccessfulApplication(t *testing.T) {
	config, handler, next := loadHandlers(t, types.APIRequestMetadata{
		Verb:   types.APIVerbCreate,
		Method: types.HTTPVerbPost,
		Scopes: []types.PermissionScope{
			types.ProjectScope,
			types.ClusterScope,
			types.NamespaceScope,
			types.ReleaseScope,
		},
	}, false, false)

	user := apitest.CreateTestUser(t, config, true)
	_, _, err := project.CreateProjectWithUser(config.Repo.Project(), &models.Project{
		Name: "test-project",
	}, user)

	if err != nil {
		t.Fatal(err)
	}

	req, rr := apitest.GetRequestAndRecorder(
		t,
		string(types.HTTPVerbPost),
		"/api/projects/1/clusters/1/default/app-1",
		nil,
	)

	req = apitest.WithURLParams(t, req, map[string]string{
		"project_id": "1",
		"cluster_id": "1",
		"namespace":  "default",
		"name":       "app-1",
	})

	req = apitest.WithAuthenticatedUser(t, req, user)

	handler.ServeHTTP(rr, req)

	assertNextHandlerCalled(t, next, rr, map[types.PermissionScope]*types.RequestAction{
		types.ProjectScope: {
			Verb: types.APIVerbCreate,
			Resource: types.NameOrUInt{
				UInt: 1,
			},
		},
		types.ClusterScope: {
			Verb: types.APIVerbCreate,
			Resource: types.NameOrUInt{
				UInt: 1,
			},
		},
		types.NamespaceScope: {
			Verb: types.APIVerbCreate,
			Resource: types.NameOrUInt{
				Name: "default",
			},
		},
		types.ReleaseScope: {
			Verb: types.APIVerbCreate,
			Resource: types.NameOrUInt{
				Name: "app-1",
			},
		},
	})
}

func TestPolicyMiddlewareInvalidPermissions(t *testing.T) {
	config, handler, next := loadHandlers(t, types.APIRequestMetadata{
		Verb:   types.APIVerbCreate,
		Method: types.HTTPVerbPost,
		Scopes: []types.PermissionScope{
			types.ProjectScope,
			types.ClusterScope,
		},
	}, false, true)

	user := apitest.CreateTestUser(t, config, true)
	_, _, err := project.CreateProjectWithUser(config.Repo.Project(), &models.Project{
		Name: "test-project",
	}, user)

	if err != nil {
		t.Fatal(err)
	}

	req, rr := apitest.GetRequestAndRecorder(t, string(types.HTTPVerbPost), "/api/projects/1/clusters/1", nil)

	req = apitest.WithURLParams(t, req, map[string]string{
		"project_id": "1",
		"cluster_id": "1",
	})

	req = apitest.WithAuthenticatedUser(t, req, user)

	handler.ServeHTTP(rr, req)

	assert.False(t, next.WasCalled, "next handler should not have been called")
	apitest.AssertResponseForbidden(t, rr)
}

func TestPolicyMiddlewareFailInvalidLoader(t *testing.T) {
	config, handler, next := loadHandlers(t, types.APIRequestMetadata{
		Verb:   types.APIVerbCreate,
		Method: types.HTTPVerbPost,
		Scopes: []types.PermissionScope{
			types.ProjectScope,
			types.ClusterScope,
		},
	}, true, false)

	user := apitest.CreateTestUser(t, config, true)
	_, _, err := project.CreateProjectWithUser(config.Repo.Project(), &models.Project{
		Name: "test-project",
	}, user)

	if err != nil {
		t.Fatal(err)
	}

	req, rr := apitest.GetRequestAndRecorder(t, string(types.HTTPVerbPost), "/api/projects/1/clusters/1", nil)

	req = apitest.WithURLParams(t, req, map[string]string{
		"project_id": "1",
		"cluster_id": "1",
	})

	req = apitest.WithAuthenticatedUser(t, req, user)

	handler.ServeHTTP(rr, req)

	assertInternalError(t, next, rr)
}

func TestPolicyMiddlewareFailBadParam(t *testing.T) {
	config, handler, next := loadHandlers(t, types.APIRequestMetadata{
		Verb:   types.APIVerbCreate,
		Method: types.HTTPVerbPost,
		Scopes: []types.PermissionScope{
			types.ProjectScope,
			types.ClusterScope,
		},
	}, true, false)

	user := apitest.CreateTestUser(t, config, true)
	_, _, err := project.CreateProjectWithUser(config.Repo.Project(), &models.Project{
		Name: "test-project",
	}, user)

	if err != nil {
		t.Fatal(err)
	}

	req, rr := apitest.GetRequestAndRecorder(t, string(types.HTTPVerbPost), "/api/projects/1/clusters/1", nil)

	req = apitest.WithURLParams(t, req, map[string]string{
		"project_id": "notuint",
		"cluster_id": "1",
	})

	req = apitest.WithAuthenticatedUser(t, req, user)

	handler.ServeHTTP(rr, req)

	assert.False(t, next.WasCalled, "next handler should not have been called")
	apitest.AssertResponseError(t, rr, http.StatusBadRequest, &types.ExternalError{
		Error: fmt.Sprintf("could not convert url parameter %s to uint, got %s", "project_id", "notuint"),
	})
}

func loadHandlers(
	t *testing.T,
	endpointMeta types.APIRequestMetadata,
	shouldLoaderFail bool,
	shouldLoaderLoadViewer bool,
) (*config.Config, http.Handler, *testHandler) {
	config := apitest.LoadConfig(t)
	var loader policy.PolicyDocumentLoader = policy.NewBasicPolicyDocumentLoader(config.Repo.Project(), config.Repo.Policy())

	if shouldLoaderFail {
		loader = &failingDocLoader{}
	}

	if shouldLoaderLoadViewer {
		loader = &viewerDocLoader{}
	}

	mwFactory := authz.NewPolicyMiddleware(config, endpointMeta, loader)

	next := &testHandler{}
	handler := mwFactory.Middleware(next)

	return config, handler, next
}

type failingDocLoader struct{}

func (f *failingDocLoader) LoadPolicyDocuments(opts *policy.PolicyLoaderOpts) ([]*types.PolicyDocument, apierrors.RequestError) {
	return nil, apierrors.NewErrInternal(fmt.Errorf("new error internal"))
}

type viewerDocLoader struct{}

func (f *viewerDocLoader) LoadPolicyDocuments(opts *policy.PolicyLoaderOpts) ([]*types.PolicyDocument, apierrors.RequestError) {
	return types.ViewerPolicy, nil
}

type testHandler struct {
	WasCalled bool
	ReqScopes map[types.PermissionScope]*types.RequestAction
}

func (t *testHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	t.WasCalled = true

	t.ReqScopes, _ = r.Context().Value(types.RequestScopeCtxKey).(map[types.PermissionScope]*types.RequestAction)
}

func assertNextHandlerCalled(
	t *testing.T,
	next *testHandler,
	rr *httptest.ResponseRecorder,
	expScopes map[types.PermissionScope]*types.RequestAction,
) {
	// make sure the handler was called with the expected user, and resulted in 200 OK
	assert := assert.New(t)

	assert.True(next.WasCalled, "next handler should have been called")
	assert.Equal(expScopes, next.ReqScopes, "expected scopes should be equal")
	assert.Equal(http.StatusOK, rr.Result().StatusCode, "status code should be ok")
}

func assertInternalError(t *testing.T, next *testHandler, rr *httptest.ResponseRecorder) {
	assert := assert.New(t)

	// first assert that that the next middleware was not called
	assert.False(next.WasCalled, "next handler should not have been called")

	apitest.AssertResponseInternalServerError(t, rr)
}
