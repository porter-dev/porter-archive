package policy_test

import (
	"fmt"
	"net/http"
	"testing"

	"github.com/go-test/deep"
	"github.com/porter-dev/porter/api/server/authz/policy"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository/test"
	"github.com/stretchr/testify/assert"
)

type basicLoaderTest struct {
	description      string
	roleKind         types.RoleKind
	expErr           bool
	expErrString     string
	expErrStatusCode int
	expPolicy        []*types.PolicyDocument
}

var basicLoaderTests = []basicLoaderTest{
	{
		description: "should load admin policy",
		roleKind:    types.RoleAdmin,
		expPolicy:   types.AdminPolicy,
	},
	{
		description: "should load developer policy",
		roleKind:    types.RoleDeveloper,
		expPolicy:   types.DeveloperPolicy,
	},
	{
		description: "should load viewer policy",
		roleKind:    types.RoleViewer,
		expPolicy:   types.ViewerPolicy,
	},
	{
		description:      "should not load custom policy for basic loader",
		roleKind:         types.RoleCustom,
		expErr:           true,
		expErrStatusCode: http.StatusForbidden,
		expErrString:     "custom role not supported for user 1, project 1",
	},
}

func TestBasicPolicyDocumentLoader(t *testing.T) {
	assert := assert.New(t)

	for _, basicTest := range basicLoaderTests {
		// use the in-memory project repo
		projRepo := test.NewProjectRepository(true)
		loader := policy.NewBasicPolicyDocumentLoader(projRepo, nil)

		project := &models.Project{
			Name: "test-project",
		}

		var err error

		project, err = projRepo.CreateProject(project)

		if err != nil {
			t.Fatalf("%v", err)
		}

		_, err = projRepo.CreateProjectRole(project, &models.Role{
			Role: types.Role{
				UserID:    1,
				ProjectID: 1,
				Kind:      basicTest.roleKind,
			},
		})

		if err != nil {
			t.Fatalf("%v", err)
		}

		docs, reqErr := loader.LoadPolicyDocuments(&policy.PolicyLoaderOpts{
			ProjectID: 1,
			UserID:    1,
		})

		assert.Equal(
			reqErr != nil,
			basicTest.expErr,
			"[ %s ]: expected error was %t, got %t",
			basicTest.description,
			reqErr != nil,
			basicTest.expErr,
		)

		if reqErr != nil && basicTest.expErr {
			readableStr := reqErr.Error()
			expReadableStr := basicTest.expErrString

			assert.Equal(
				expReadableStr,
				readableStr,
				"[ %s ]: readable string not equal",
				basicTest.description,
			)

			// check that external and internal errors are returned as well
			assert.Equal(
				basicTest.expErrStatusCode,
				reqErr.GetStatusCode(),
				"[ %s ]: status code not equal",
				basicTest.description,
			)
		} else if !basicTest.expErr {
			if diff := deep.Equal(basicTest.expPolicy, docs); diff != nil {
				t.Errorf("[ %s ]: policy documents not equal:", basicTest.description)
				t.Error(diff)
			}
		}

	}
}

func TestErrorForbiddenInvalidRole(t *testing.T) {
	assert := assert.New(t)

	// use the in-memory project repo
	projRepo := test.NewProjectRepository(true)
	loader := policy.NewBasicPolicyDocumentLoader(projRepo, nil)

	project := &models.Project{
		Name: "test-project",
	}

	var err error

	project, err = projRepo.CreateProject(project)

	if err != nil {
		t.Fatalf("%v", err)
	}

	_, err = projRepo.CreateProjectRole(project, &models.Role{
		Role: types.Role{
			UserID:    1,
			ProjectID: 1,
			Kind:      types.RoleAdmin,
		},
	})

	if err != nil {
		t.Fatalf("%v", err)
	}

	_, reqErr := loader.LoadPolicyDocuments(&policy.PolicyLoaderOpts{
		ProjectID: 1,
		UserID:    2,
	})

	if reqErr == nil {
		t.Fatalf("Expected forbidden error for invalid project role")
	}

	// check that external and internal errors are returned as well
	assert.Equal(
		http.StatusForbidden,
		reqErr.GetStatusCode(),
		"status is not status forbidden",
	)

	assert.Equal(
		fmt.Sprintf("user %d does not have a role in project %d", 2, 1),
		reqErr.Error(),
		"error message is not correct",
	)
}

func TestErrorCannotQuery(t *testing.T) {
	assert := assert.New(t)

	// use the in-memory project repo
	projRepo := test.NewProjectRepository(false)
	loader := policy.NewBasicPolicyDocumentLoader(projRepo, nil)

	_, reqErr := loader.LoadPolicyDocuments(&policy.PolicyLoaderOpts{
		ProjectID: 2,
		UserID:    1,
	})

	if reqErr == nil {
		t.Fatalf("Expected internal error for failing to query")
	}

	// check that external and internal errors are returned as well
	assert.Equal(
		http.StatusInternalServerError,
		reqErr.GetStatusCode(),
		"status is not status internal",
	)
}
