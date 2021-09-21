package gorm_test

import (
	"testing"

	"gorm.io/gorm"

	"github.com/go-test/deep"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

func TestCreateInfra(t *testing.T) {
	tester := &tester{
		dbFileName: "./porter_create_aws_infra.db",
	}

	setupTestEnv(tester, t)
	initProject(tester, t)
	defer cleanup(tester, t)

	infra := &models.Infra{
		Kind:      types.InfraECR,
		ProjectID: tester.initProjects[0].Model.ID,
		Status:    types.StatusCreated,
	}

	infra, err := tester.repo.Infra().CreateInfra(infra)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	infra, err = tester.repo.Infra().ReadInfra(tester.initProjects[0].Model.ID, infra.Model.ID)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	// make sure id is 1 and name is "ecr"
	if infra.Model.ID != 1 {
		t.Errorf("incorrect registry ID: expected %d, got %d\n", 1, infra.Model.ID)
	}

	if infra.Kind != types.InfraECR {
		t.Errorf("incorrect aws infra kind: expected %s, got %s\n", types.InfraECR, infra.Kind)
	}

	if infra.Status != types.StatusCreated {
		t.Errorf("incorrect aws infra status: expected %s, got %s\n", types.StatusCreated, infra.Status)
	}
}

func TestListInfrasByProjectID(t *testing.T) {
	tester := &tester{
		dbFileName: "./porter_list_aws_infras.db",
	}

	setupTestEnv(tester, t)
	initProject(tester, t)
	initInfra(tester, t)
	defer cleanup(tester, t)

	infras, err := tester.repo.Infra().ListInfrasByProjectID(
		tester.initProjects[0].Model.ID,
	)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	if len(infras) != 1 {
		t.Fatalf("length of aws infras incorrect: expected %d, got %d\n", 1, len(infras))
	}

	// make sure data is correct
	expInfra := models.Infra{
		Kind:      "ecr",
		ProjectID: tester.initProjects[0].Model.ID,
		Status:    types.StatusCreated,
	}

	infra := infras[0]

	// reset fields for reflect.DeepEqual
	infra.Model = gorm.Model{}

	if diff := deep.Equal(expInfra, *infra); diff != nil {
		t.Errorf("incorrect aws infra")
		t.Error(diff)
	}
}
