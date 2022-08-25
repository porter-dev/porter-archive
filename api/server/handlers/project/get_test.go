package project_test

import (
	"testing"

	"github.com/porter-dev/porter/api/server/handlers/project"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apitest"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

func TestGetProjectSuccessful(t *testing.T) {
	// create a test project
	config := apitest.LoadConfig(t)
	user := apitest.CreateTestUser(t, config, true)

	proj, err := config.Repo.Project().CreateProject(&models.Project{
		Name: "test-project",
	})

	if err != nil {
		t.Fatal(err)
	}

	req, rr := apitest.GetRequestAndRecorder(t, string(types.HTTPVerbPost), "/api/projects/1", nil)

	req = apitest.WithAuthenticatedUser(t, req, user)
	req = apitest.WithProject(t, req, proj)

	handler := project.NewProjectGetHandler(
		config,
		shared.NewDefaultResultWriter(config.Logger, config.Alerter),
	)

	handler.ServeHTTP(rr, req)

	expProject := proj.ToProjectType()
	gotProject := &types.Project{}

	apitest.AssertResponseExpected(t, rr, expProject, gotProject)
}
