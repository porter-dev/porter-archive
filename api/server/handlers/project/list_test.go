package project_test

import (
	"testing"

	"github.com/porter-dev/porter/api/server/handlers/project"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apitest"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository/test"
)

func TestListProjectsSuccessful(t *testing.T) {
	// create a test project
	config := apitest.LoadConfig(t)
	user := apitest.CreateTestUser(t, config, true)
	proj1, _, err := project.CreateProjectWithUser(config.Repo.Project(), &models.Project{
		Name: "test-project",
	}, user)

	if err != nil {
		t.Fatal(err)
	}

	proj2, _, err := project.CreateProjectWithUser(config.Repo.Project(), &models.Project{
		Name: "test-project-2",
	}, user)

	if err != nil {
		t.Fatal(err)
	}

	req, rr := apitest.GetRequestAndRecorder(t, string(types.HTTPVerbGet), "/api/projects", nil)

	req = apitest.WithAuthenticatedUser(t, req, user)

	handler := project.NewProjectListHandler(
		config,
		shared.NewDefaultResultWriter(config),
	)

	handler.ServeHTTP(rr, req)

	expProjects := make([]*types.Project, 0)

	expProjects = append(expProjects, proj1.ToProjectType())
	expProjects = append(expProjects, proj2.ToProjectType())
	gotProjects := []*types.Project{}

	apitest.AssertResponseExpected(t, rr, &expProjects, &gotProjects)
}

func TestFailingListMethod(t *testing.T) {
	req, rr := apitest.GetRequestAndRecorder(
		t,
		string(types.HTTPVerbGet),
		"/api/projects",
		nil,
	)

	config := apitest.LoadConfig(t, test.ListProjectsByUserIDMethod)
	user := apitest.CreateTestUser(t, config, true)
	req = apitest.WithAuthenticatedUser(t, req, user)

	handler := project.NewProjectListHandler(
		config,
		shared.NewDefaultResultWriter(config),
	)

	handler.ServeHTTP(rr, req)

	apitest.AssertResponseInternalServerError(t, rr)
}
