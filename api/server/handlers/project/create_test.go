package project_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/porter-dev/porter/api/server/handlers/project"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apitest"
	"github.com/porter-dev/porter/api/server/shared/requestutils"
	"github.com/porter-dev/porter/api/types"
	"github.com/stretchr/testify/assert"
)

func TestCreateProjectSuccessful(t *testing.T) {
	// create request for create project
	data, err := json.Marshal(&types.CreateProjectRequest{
		Name: "test-project",
	})

	if err != nil {
		t.Fatal(err)
	}

	req, err := http.NewRequest("POST", "/api/projects", strings.NewReader(string(data)))

	if err != nil {
		t.Fatal(err)
	}

	rr := httptest.NewRecorder()

	// attach authenticated user to context
	config := apitest.LoadConfig(t)

	user := apitest.CreateTestUser(t, config)

	ctx := req.Context()
	ctx = context.WithValue(ctx, types.UserScope, user)

	req = req.WithContext(ctx)

	// create the project
	handler := project.NewProjectCreateHandler(
		config,
		shared.NewDefaultRequestDecoderValidator(
			config,
			requestutils.NewDefaultValidator(),
			requestutils.NewDefaultDecoder(),
		),
		shared.NewDefaultResultWriter(config),
	)

	handler.ServeHTTP(rr, req)

	// ensure the API response is correct
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
	}

	gotProject := &types.CreateProjectResponse{}

	err = json.NewDecoder(rr.Body).Decode(gotProject)

	if err != nil {
		t.Fatal(err)
	}

	assert.Equal(
		t,
		expProject,
		gotProject,
		"incorrect response data",
	)
}
