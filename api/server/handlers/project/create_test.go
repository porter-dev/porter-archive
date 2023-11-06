package project_test

import (
	"net/http"
	"testing"

	"github.com/porter-dev/porter/api/server/handlers/project"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apitest"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/repository/test"
)

func TestCreateProjectSuccessful(t *testing.T) {
	req, rr := apitest.GetRequestAndRecorder(
		t,
		string(types.HTTPVerbPost),
		"/api/projects",
		&types.CreateProjectRequest{
			Name: "test-project",
		},
	)

	config := apitest.LoadConfig(t)
	user := apitest.CreateTestUser(t, config, true)
	req = apitest.WithAuthenticatedUser(t, req, user)

	handler := project.NewProjectCreateHandler(
		config,
		shared.NewDefaultRequestDecoderValidator(config.Logger, config.Alerter),
		shared.NewDefaultResultWriter(config.Logger, config.Alerter),
	)

	handler.ServeHTTP(rr, req)

	expProject := &types.CreateProjectResponse{
		ID:   1,
		Name: "test-project",
		Roles: []*types.Role{
			{
				Kind:      types.RoleAdmin,
				UserID:    user.ID,
				ProjectID: 1,
			},
		},
		CapiProvisionerEnabled: true,
		SimplifiedViewEnabled:  true,
		HelmValuesEnabled:      false,
		MultiCluster:           false,
		EnableReprovision:      false,
		ValidateApplyV2:        true,
	}

	gotProject := &types.CreateProjectResponse{}

	apitest.AssertResponseExpected(t, rr, expProject, gotProject)
}

func TestFailingDecoderValidator(t *testing.T) {
	req, rr := apitest.GetRequestAndRecorder(
		t,
		string(types.HTTPVerbPost),
		"/api/projects",
		&types.CreateProjectRequest{
			Name: "test-project",
		},
	)

	config := apitest.LoadConfig(t)
	user := apitest.CreateTestUser(t, config, true)
	req = apitest.WithAuthenticatedUser(t, req, user)

	handler := project.NewProjectCreateHandler(
		config,
		apitest.NewFailingDecoderValidator(config),
		shared.NewDefaultResultWriter(config.Logger, config.Alerter),
	)

	handler.ServeHTTP(rr, req)

	apitest.AssertResponseInternalServerError(t, rr)
}

func TestFailingCreateMethod(t *testing.T) {
	req, rr := apitest.GetRequestAndRecorder(
		t,
		string(types.HTTPVerbPost),
		"/api/projects",
		&types.CreateProjectRequest{
			Name: "test-project",
		},
	)

	config := apitest.LoadConfig(t, test.CreateProjectMethod)
	user := apitest.CreateTestUser(t, config, true)
	req = apitest.WithAuthenticatedUser(t, req, user)

	handler := project.NewProjectCreateHandler(
		config,
		shared.NewDefaultRequestDecoderValidator(config.Logger, config.Alerter),
		shared.NewDefaultResultWriter(config.Logger, config.Alerter),
	)

	handler.ServeHTTP(rr, req)

	apitest.AssertResponseError(t, rr, http.StatusInternalServerError, &types.ExternalError{
		Error: "Cannot write database",
	})
}

func TestFailingCreateRoleMethod(t *testing.T) {
	req, rr := apitest.GetRequestAndRecorder(
		t,
		string(types.HTTPVerbPost),
		"/api/projects",
		&types.CreateProjectRequest{
			Name: "test-project",
		},
	)

	config := apitest.LoadConfig(t, test.CreateProjectRoleMethod)
	user := apitest.CreateTestUser(t, config, true)
	req = apitest.WithAuthenticatedUser(t, req, user)

	handler := project.NewProjectCreateHandler(
		config,
		shared.NewDefaultRequestDecoderValidator(config.Logger, config.Alerter),
		shared.NewDefaultResultWriter(config.Logger, config.Alerter),
	)

	handler.ServeHTTP(rr, req)

	apitest.AssertResponseError(t, rr, http.StatusInternalServerError, &types.ExternalError{
		Error: "Cannot write database",
	})
}

func TestFailingReadMethod(t *testing.T) {
	req, rr := apitest.GetRequestAndRecorder(
		t,
		string(types.HTTPVerbPost),
		"/api/projects",
		&types.CreateProjectRequest{
			Name: "test-project",
		},
	)

	config := apitest.LoadConfig(t, test.ReadProjectMethod)
	user := apitest.CreateTestUser(t, config, true)
	req = apitest.WithAuthenticatedUser(t, req, user)

	handler := project.NewProjectCreateHandler(
		config,
		shared.NewDefaultRequestDecoderValidator(config.Logger, config.Alerter),
		shared.NewDefaultResultWriter(config.Logger, config.Alerter),
	)

	handler.ServeHTTP(rr, req)

	apitest.AssertResponseError(t, rr, http.StatusInternalServerError, &types.ExternalError{
		Error: "Cannot read from database",
	})
}
