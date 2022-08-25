package gorm_test

import (
	"testing"

	"github.com/porter-dev/porter/internal/models"

	"gorm.io/gorm"
)

func TestCreateProject(t *testing.T) {
	tester := &tester{
		dbFileName: "./porter_create_proj.db",
	}

	setupTestEnv(tester, t)
	defer cleanup(tester, t)

	proj := &models.Project{
		Name: "project-test",
	}

	proj, err := tester.repo.Project().CreateProject(proj)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	proj, err = tester.repo.Project().ReadProject(proj.Model.ID)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	// make sure id is 1 and name is "project-test"
	if proj.Model.ID != 1 {
		t.Errorf("incorrect project ID: expected %d, got %d\n", 1, proj.Model.ID)
	}

	if proj.Name != "project-test" {
		t.Errorf("incorrect project name: expected %s, got %s\n", "project-test", proj.Name)
	}
}

func TestDeleteProject(t *testing.T) {
	tester := &tester{
		dbFileName: "./porter_delete_proj.db",
	}

	setupTestEnv(tester, t)
	initProject(tester, t)
	defer cleanup(tester, t)

	proj, err := tester.repo.Project().DeleteProject(tester.initProjects[0])

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	// attempt to read the project and ensure that the error is gorm.ErrRecordNotFound
	_, err = tester.repo.Project().ReadProject(proj.Model.ID)

	if err != gorm.ErrRecordNotFound {
		t.Fatalf("read should have returned record not found: returned %v\n", err)
	}
}
