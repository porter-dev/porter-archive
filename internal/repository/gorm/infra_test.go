package gorm_test

import (
	"testing"

	"github.com/go-test/deep"
	"github.com/porter-dev/porter/internal/models"
	"gorm.io/gorm"
)

func TestCreateAWSInfra(t *testing.T) {
	tester := &tester{
		dbFileName: "./porter_create_aws_infra.db",
	}

	setupTestEnv(tester, t)
	initProject(tester, t)
	defer cleanup(tester, t)

	infra := &models.AWSInfra{
		Kind:      "ecr",
		ProjectID: tester.initProjects[0].Model.ID,
		Status:    models.StatusCreated,
	}

	infra, err := tester.repo.AWSInfra.CreateAWSInfra(infra)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	infra, err = tester.repo.AWSInfra.ReadAWSInfra(infra.Model.ID)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	// make sure id is 1 and name is "ecr"
	if infra.Model.ID != 1 {
		t.Errorf("incorrect registry ID: expected %d, got %d\n", 1, infra.Model.ID)
	}

	if infra.Kind != "ecr" {
		t.Errorf("incorrect aws infra kind: expected %s, got %s\n", "ecr", infra.Kind)
	}

	if infra.Status != models.StatusCreated {
		t.Errorf("incorrect aws infra status: expected %s, got %s\n", models.StatusCreated, infra.Status)
	}
}

func TestListAWSInfrasByProjectID(t *testing.T) {
	tester := &tester{
		dbFileName: "./porter_list_aws_infras.db",
	}

	setupTestEnv(tester, t)
	initProject(tester, t)
	initAWSInfra(tester, t)
	defer cleanup(tester, t)

	infras, err := tester.repo.AWSInfra.ListAWSInfrasByProjectID(
		tester.initProjects[0].Model.ID,
	)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	if len(infras) != 1 {
		t.Fatalf("length of aws infras incorrect: expected %d, got %d\n", 1, len(infras))
	}

	// make sure data is correct
	expAWSInfra := models.AWSInfra{
		Kind:      "ecr",
		ProjectID: tester.initProjects[0].Model.ID,
		Status:    models.StatusCreated,
	}

	infra := infras[0]

	// reset fields for reflect.DeepEqual
	infra.Model = gorm.Model{}

	if diff := deep.Equal(expAWSInfra, *infra); diff != nil {
		t.Errorf("incorrect aws infra")
		t.Error(diff)
	}
}
