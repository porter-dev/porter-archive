package gorm_test

import (
	"testing"
)

func TestUserEmailExistsOnAllowlist(t *testing.T) {
	tester := &tester{
		dbFileName: "./porter_create_gr.db",
	}

	setupTestEnv(tester, t)
	initUser(tester, t)
	initProject(tester, t)
	initOAuthIntegration(tester, t)
	defer cleanup(tester, t)

	expected := true

	found, err := tester.repo.Allowlist().UserEmailExists("some@email.com")

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	if found != expected {
		t.Errorf("expected found to be %t but got: %t", expected, found)
	}
}

func TestUserDontExistsOnAllowList(t *testing.T) {
	tester := &tester{
		dbFileName: "./porter_create_gr.db",
	}

	setupTestEnv(tester, t)
	initUser(tester, t)
	initProject(tester, t)
	initOAuthIntegration(tester, t)
	defer cleanup(tester, t)

	expected := false

	found, err := tester.repo.Allowlist().UserEmailExists("nonexisting@email.com")

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	if found != expected {
		t.Errorf("expected found to be %t but got: %t", expected, found)
	}
}
