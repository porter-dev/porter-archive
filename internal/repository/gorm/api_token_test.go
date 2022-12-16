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

	// expected := false

	projectID := tester.initProjects[0].Model.ID
	found, err := tester.repo.APIToken().ListAPITokensByProjectID(projectID)
	if err != nil {
		t.Fatalf("%v\n", err)
	}

	// if found != expected {
	// 	t.Errorf("expected found to be %t but got: %t", expected, found)
	// }
	t.Logf("stefan, %#v", found[0])
}
