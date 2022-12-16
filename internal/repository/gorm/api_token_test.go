package gorm_test

import (
	"testing"
)

func TestListAPITokensByProjectID(t *testing.T) {
	tester := &tester{
		dbFileName: "./porter_tokens.db",
	}

	setupTestEnv(tester, t)
	initProject(tester, t)
	initAPITokens(tester, t)
	initMultiUser(tester, t)
	defer cleanup(tester, t)

	projectID := tester.initProjects[0].Model.ID
	found, err := tester.repo.APIToken().ListAPITokensByProjectID(projectID)
	if err != nil {
		t.Fatalf("%v\n", err)
	}

	if len(found) != 1 {
		t.Errorf("expected to find 1 row, found %d", len(found))
	}

	if found[0].ID != 1 {
		t.Errorf("expected found to be %d but got: %d", 1, found[0].ID)
	}
}
