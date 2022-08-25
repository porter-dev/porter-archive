package policy_test

import (
	"encoding/json"
	"net/http"
	"testing"

	"github.com/porter-dev/porter/api/server/authz/policy"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository/test"
	"github.com/stretchr/testify/assert"
)

func TestBasicPolicyDocumentLoader(t *testing.T) {
	assert := assert.New(t)

	// use the in-memory project repo
	projRepo := test.NewProjectRepository(true)
	projRoleRepo := test.NewProjectRoleRepository(true)
	policyRepo := test.NewPolicyRepository(true)

	project, err := projRepo.CreateProject(&models.Project{
		Name: "test-project",
	})

	if err != nil {
		t.Fatalf("%v", err)
	}

	policyBytes, err := json.Marshal(types.AdminPolicy)

	if err != nil {
		t.Fatalf("%v", err)
	}

	pol, err := policyRepo.CreatePolicy(&models.Policy{
		UniqueID:    "test-policy-uid",
		ProjectID:   project.ID,
		Name:        "test-policy",
		PolicyBytes: policyBytes,
	})

	if err != nil {
		t.Fatalf("%v", err)
	}

	role, err := projRoleRepo.CreateProjectRole(&models.ProjectRole{
		UniqueID:  "1-admin",
		ProjectID: project.ID,
		PolicyUID: pol.UniqueID,
		Name:      "admin",
	})

	if err != nil {
		t.Fatalf("%v", err)
	}

	err = projRoleRepo.UpdateUsersInProjectRole(project.ID, role.UniqueID, []uint{1})

	if err != nil {
		t.Fatalf("%v", err)
	}

	loader := policy.NewBasicPolicyDocumentLoader(projRoleRepo, policyRepo)

	docs, reqErr := loader.LoadPolicyDocuments(&policy.PolicyLoaderOpts{
		ProjectID: 1,
		UserID:    1,
	})

	assert.Equal(true, reqErr == nil)
	assert.Equal(1, len(docs))
	assert.Equal(types.AdminPolicy[0], docs[0])
}

func TestErrorForbiddenInvalidRole(t *testing.T) {
	assert := assert.New(t)

	// use the in-memory project repo
	projRepo := test.NewProjectRepository(true)
	projRoleRepo := test.NewProjectRoleRepository(true)
	policyRepo := test.NewPolicyRepository(true)

	loader := policy.NewBasicPolicyDocumentLoader(projRoleRepo, policyRepo)

	project, err := projRepo.CreateProject(&models.Project{
		Name: "test-project",
	})

	if err != nil {
		t.Fatalf("%v", err)
	}

	policyBytes, err := json.Marshal(types.RoleAdmin)

	if err != nil {
		t.Fatalf("%v", err)
	}

	pol, err := policyRepo.CreatePolicy(&models.Policy{
		UniqueID:    "test-policy-uid",
		ProjectID:   project.ID,
		Name:        "test-policy",
		PolicyBytes: policyBytes,
	})

	if err != nil {
		t.Fatalf("%v", err)
	}

	_, err = projRoleRepo.CreateProjectRole(&models.ProjectRole{
		UniqueID:  "1-admin",
		ProjectID: project.ID,
		PolicyUID: pol.UniqueID,
		Name:      "admin",
	})

	if err != nil {
		t.Fatalf("%v", err)
	}

	_, reqErr := loader.LoadPolicyDocuments(&policy.PolicyLoaderOpts{
		ProjectID: 1,
		UserID:    1,
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
		"user does not have any roles assigned in this project",
		reqErr.Error(),
		"error message is not correct",
	)
}

func TestErrorCannotQuery(t *testing.T) {
	assert := assert.New(t)

	// use the in-memory project repo
	projRoleRepo := test.NewProjectRoleRepository(false)
	policyRepo := test.NewPolicyRepository(false)
	loader := policy.NewBasicPolicyDocumentLoader(projRoleRepo, policyRepo)

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
