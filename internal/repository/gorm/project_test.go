package gorm_test

import (
	"os"
	"testing"

	"github.com/go-test/deep"
	"github.com/porter-dev/porter/internal/models"

	"github.com/porter-dev/porter/internal/adapter"
	"github.com/porter-dev/porter/internal/config"
	"github.com/porter-dev/porter/internal/repository"
	"github.com/porter-dev/porter/internal/repository/gorm"

	orm "gorm.io/gorm"
)

type tester struct {
	repo             *repository.Repository
	key              *[32]byte
	dbFileName       string
	initProjects     []*models.Project
	initSACandidates []*models.ServiceAccountCandidate
	initSAs          []*models.ServiceAccount
}

func setupTestEnv(tester *tester, t *testing.T) {
	t.Helper()

	db, err := adapter.New(&config.DBConf{
		EncryptionKey: "__random_strong_encryption_key__",
		SQLLite:       true,
		SQLLitePath:   tester.dbFileName,
	})

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	err = db.AutoMigrate(
		&models.Project{},
		&models.Role{},
		&models.ServiceAccount{},
		&models.ServiceAccountAction{},
		&models.ServiceAccountCandidate{},
		&models.Cluster{},
		&models.User{},
		&models.Session{},
	)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	var key [32]byte

	for i, b := range []byte("__random_strong_encryption_key__") {
		key[i] = b
	}

	tester.key = &key

	tester.repo = gorm.NewRepository(db, &key)
}

func cleanup(tester *tester, t *testing.T) {
	t.Helper()

	// remove the created file file
	os.Remove(tester.dbFileName)
}

func initProject(tester *tester, t *testing.T) {
	t.Helper()

	proj := &models.Project{
		Name: "project-test",
	}

	proj, err := tester.repo.Project.CreateProject(proj)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	tester.initProjects = append(tester.initProjects, proj)
}

func TestCreateProject(t *testing.T) {
	tester := &tester{
		dbFileName: "./porter_create_proj.db",
	}

	setupTestEnv(tester, t)
	defer cleanup(tester, t)

	proj := &models.Project{
		Name: "project-test",
	}

	proj, err := tester.repo.Project.CreateProject(proj)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	proj, err = tester.repo.Project.ReadProject(proj.Model.ID)

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

func TestCreateProjectRole(t *testing.T) {
	tester := &tester{
		dbFileName: "./porter_create_proj_role.db",
	}

	setupTestEnv(tester, t)
	initProject(tester, t)
	defer cleanup(tester, t)

	role := &models.Role{
		Kind:      models.RoleAdmin,
		UserID:    0,
		ProjectID: tester.initProjects[0].Model.ID,
	}

	role, err := tester.repo.Project.CreateProjectRole(tester.initProjects[0], role)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	proj, err := tester.repo.Project.ReadProject(tester.initProjects[0].Model.ID)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	// make sure IDs are correct
	if proj.Model.ID != 1 {
		t.Errorf("incorrect project ID: expected %d, got %d\n", 1, proj.Model.ID)
	}

	if len(proj.Roles) != 1 {
		t.Fatalf("project roles incorrect length: expected %d, got %d\n", 1, len(proj.Roles))
	}

	if proj.Roles[0].Model.ID != 1 {
		t.Fatalf("incorrect role ID: expected %d, got %d\n", 1, proj.Roles[0].Model.ID)
	}

	// make sure data is correct
	expProj := &models.Project{
		Name: "project-test",
		Roles: []models.Role{
			models.Role{
				Kind:      models.RoleAdmin,
				UserID:    0,
				ProjectID: 1,
			},
		},
	}

	copyProj := proj

	// reset fields for reflect.DeepEqual
	copyProj.Model = orm.Model{}
	copyProj.Roles[0].Model = orm.Model{}

	if diff := deep.Equal(copyProj, expProj); diff != nil {
		t.Errorf("incorrect project")
		t.Error(diff)
	}
}
