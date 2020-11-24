package gorm_test

import (
	"testing"

	"github.com/go-test/deep"
	"github.com/porter-dev/porter/internal/models"
	"gorm.io/gorm"
)

func TestCreateRegistry(t *testing.T) {
	tester := &tester{
		dbFileName: "./porter_create_reg.db",
	}

	setupTestEnv(tester, t)
	initProject(tester, t)
	defer cleanup(tester, t)

	reg := &models.Registry{
		Name:      "registry-test",
		ProjectID: tester.initProjects[0].Model.ID,
	}

	reg, err := tester.repo.Registry.CreateRegistry(reg)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	reg, err = tester.repo.Registry.ReadRegistry(reg.Model.ID)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	// make sure id is 1 and name is "registry-test"
	if reg.Model.ID != 1 {
		t.Errorf("incorrect registry ID: expected %d, got %d\n", 1, reg.Model.ID)
	}

	if reg.Name != "registry-test" {
		t.Errorf("incorrect project name: expected %s, got %s\n", "registry-test", reg.Name)
	}
}

func TestListRegistriesByProjectID(t *testing.T) {
	tester := &tester{
		dbFileName: "./porter_list_regs.db",
	}

	setupTestEnv(tester, t)
	initProject(tester, t)
	initRegistry(tester, t)
	defer cleanup(tester, t)

	regs, err := tester.repo.Registry.ListRegistriesByProjectID(
		tester.initProjects[0].Model.ID,
	)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	if len(regs) != 1 {
		t.Fatalf("length of registries incorrect: expected %d, got %d\n", 1, len(regs))
	}

	// make sure data is correct
	expRegistry := models.Registry{
		ProjectID: tester.initProjects[0].ID,
		Name:      "registry-test",
	}

	reg := regs[0]

	// reset fields for reflect.DeepEqual
	reg.Model = gorm.Model{}

	if diff := deep.Equal(expRegistry, *reg); diff != nil {
		t.Errorf("incorrect registry")
		t.Error(diff)
	}
}
