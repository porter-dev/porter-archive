package authz_test

import (
	"net/http"
	"testing"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/authz/policy"
	"github.com/porter-dev/porter/api/server/handlers/project"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apitest"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository/test"
	"github.com/stretchr/testify/assert"
)

func TestProjectMiddlewareSuccessful(t *testing.T) {
	config, handler, next := loadProjectHandlers(t)

	user := apitest.CreateTestUser(t, config, true)
	proj, err := project.CreateProjectWithUser(config.Repo.Project(), &models.Project{
		Name: "test-project",
	}, user)

	if err != nil {
		t.Fatal(err)
	}

	req, rr := apitest.GetRequestAndRecorder(t, string(types.HTTPVerbPost), "/api/projects/1", nil)
	req = apitest.WithAuthenticatedUser(t, req, user)
	req = apitest.WithRequestScopes(t, req, map[types.PermissionScope]*policy.RequestAction{
		types.ProjectScope: {
			Verb: types.APIVerbCreate,
			Resource: types.NameOrUInt{
				UInt: 1,
			},
		},
	})

	handler.ServeHTTP(rr, req)
	assert.True(t, next.WasCalled, "next handler should have been called")
	assert.Equal(t, proj, next.Project, "project should be equal")
}

func TestProjectMiddlewareFailedRead(t *testing.T) {
	config, _, _ := loadProjectHandlers(t)

	user := apitest.CreateTestUser(t, config, true)
	_, err := project.CreateProjectWithUser(config.Repo.Project(), &models.Project{
		Name: "test-project",
	}, user)

	if err != nil {
		t.Fatal(err)
	}

	config, handler, next := loadProjectHandlers(t, test.ReadProjectMethod)

	req, rr := apitest.GetRequestAndRecorder(t, string(types.HTTPVerbPost), "/api/projects/1", nil)
	req = apitest.WithAuthenticatedUser(t, req, user)
	req = apitest.WithRequestScopes(t, req, map[types.PermissionScope]*policy.RequestAction{
		types.ProjectScope: {
			Verb: types.APIVerbCreate,
			Resource: types.NameOrUInt{
				UInt: 1,
			},
		},
	})

	handler.ServeHTTP(rr, req)
	assert.False(t, next.WasCalled, "next handler should not have been called")
	apitest.AssertResponseInternalServerError(t, rr)
}

func loadProjectHandlers(
	t *testing.T,
	failingRepoMethods ...string,
) (*shared.Config, http.Handler, *testProjectHandler) {
	config := apitest.LoadConfig(t, failingRepoMethods...)
	mwFactory := authz.NewProjectScopedFactory(config)

	next := &testProjectHandler{}
	handler := mwFactory.Middleware(next)

	return config, handler, next
}

type testProjectHandler struct {
	WasCalled bool
	Project   *models.Project
}

func (t *testProjectHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	t.WasCalled = true

	t.Project, _ = r.Context().Value(types.ProjectScope).(*models.Project)
}
