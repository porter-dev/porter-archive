package gorm_test

import (
	"testing"

	"github.com/go-test/deep"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"

	"gorm.io/gorm"
	orm "gorm.io/gorm"
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

func TestCreateProjectRole(t *testing.T) {
	tester := &tester{
		dbFileName: "./porter_create_proj_role.db",
	}

	setupTestEnv(tester, t)
	initProject(tester, t)
	defer cleanup(tester, t)

	role := &models.Role{
		Role: types.Role{
			Kind:      types.RoleAdmin,
			UserID:    0,
			ProjectID: tester.initProjects[0].Model.ID,
		},
	}

	role, err := tester.repo.Project().CreateProjectRole(tester.initProjects[0], role)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	proj, err := tester.repo.Project().ReadProject(tester.initProjects[0].Model.ID)

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
			{
				Role: types.Role{
					Kind:      types.RoleAdmin,
					UserID:    0,
					ProjectID: 1,
				},
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

func TestUpdateProjectRole(t *testing.T) {
	tester := &tester{
		dbFileName: "./porter_update_proj_role.db",
	}

	setupTestEnv(tester, t)
	initProject(tester, t)
	initUser(tester, t)
	initProjectRole(tester, t)
	defer cleanup(tester, t)

	role := &models.Role{
		Kind:      models.RoleViewer,
		UserID:    tester.initUsers[0].Model.ID,
		ProjectID: tester.initProjects[0].Model.ID,
	}

	role, err := tester.repo.Project.UpdateProjectRole(tester.initProjects[0].Model.ID, role)

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
			{
				Kind:      models.RoleViewer,
				UserID:    1,
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

func TestListProjectsByUserID(t *testing.T) {
	tester := &tester{
		dbFileName: "./list_projects_user_id.db",
	}

	setupTestEnv(tester, t)
	initUser(tester, t)
	// create two projects, same name
	initProject(tester, t)
	initProjectRole(tester, t)
	initProject(tester, t)

	role := &models.Role{
		Role: types.Role{
			Kind:   types.RoleAdmin,
			UserID: 1,
		},
	}

	role, err := tester.repo.Project().CreateProjectRole(tester.initProjects[1], role)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	defer cleanup(tester, t)

	projects, err := tester.repo.Project().ListProjectsByUserID(tester.initUsers[0].Model.ID)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	if len(projects) != 2 {
		t.Fatalf("projects length was not 2\n")
	}

	for i, project := range projects {
		// make sure data is correct
		expProj := &models.Project{
			Name: "project-test",
			Roles: []models.Role{
				{
					Role: types.Role{
						Kind:      types.RoleAdmin,
						UserID:    tester.initUsers[0].Model.ID,
						ProjectID: uint(i + 1),
					},
				},
			},
		}

		copyProj := project

		// reset fields for reflect.DeepEqual
		copyProj.Model = orm.Model{}
		copyProj.Roles[0].Model = orm.Model{}

		if diff := deep.Equal(copyProj, expProj); diff != nil {
			t.Errorf("incorrect project")
			t.Error(diff)
		}
	}
}

func TestReadProjectRole(t *testing.T) {
	tester := &tester{
		dbFileName: "./get_project_role.db",
	}

	setupTestEnv(tester, t)
	initUser(tester, t)

	// create two projects, same name
	initProject(tester, t)
	initProjectRole(tester, t)

	defer cleanup(tester, t)

	role, err := tester.repo.Project().ReadProjectRole(1, 1)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	role.Model = gorm.Model{}

	expRole := &models.Role{
		Role: types.Role{
			Kind:      types.RoleAdmin,
			UserID:    1,
			ProjectID: 1,
		},
	}

	if diff := deep.Equal(role, expRole); diff != nil {
		t.Errorf("incorrect role")
		t.Error(diff)
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

func TestDeleteProjectRole(t *testing.T) {
	tester := &tester{
		dbFileName: "./porter_delete_proj_role.db",
	}

	setupTestEnv(tester, t)
	initProject(tester, t)
	initUser(tester, t)
	initProjectRole(tester, t)
	defer cleanup(tester, t)

	_, err := tester.repo.Project.DeleteProjectRole(tester.initProjects[0].Model.ID, tester.initUsers[0].Model.ID)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	// attempt to read the project and ensure that the error is gorm.ErrRecordNotFound
	proj, err := tester.repo.Project.ReadProject(tester.initProjects[0].Model.ID)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	// make sure IDs are correct
	if proj.Model.ID != 1 {
		t.Errorf("incorrect project ID: expected %d, got %d\n", 1, proj.Model.ID)
	}

	if len(proj.Roles) != 0 {
		t.Fatalf("project roles incorrect length: expected %d, got %d\n", 0, len(proj.Roles))
	}

	// make sure data is correct
	expProj := &models.Project{
		Name:  "project-test",
		Roles: []models.Role{},
	}

	copyProj := proj

	// reset fields for reflect.DeepEqual
	copyProj.Model = orm.Model{}

	if diff := deep.Equal(copyProj, expProj); diff != nil {
		t.Errorf("incorrect project")
		t.Error(diff)
	}
}
