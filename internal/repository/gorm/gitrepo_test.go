package gorm_test

import (
	"testing"

	"github.com/go-test/deep"
	"github.com/porter-dev/porter/internal/models"
	orm "gorm.io/gorm"
)

func TestCreateGitRepo(t *testing.T) {
	tester := &tester{
		dbFileName: "./porter_create_gr.db",
	}

	setupTestEnv(tester, t)
	initUser(tester, t)
	initProject(tester, t)
	initOAuthIntegration(tester, t)
	defer cleanup(tester, t)

	gr := &models.GitRepo{
		ProjectID:          tester.initProjects[0].ID,
		RepoEntity:         "porter-dev",
		OAuthIntegrationID: tester.initOAuths[0].ID,
	}

	expGR := *gr

	gr, err := tester.repo.GitRepo().CreateGitRepo(gr)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	gr, err = tester.repo.GitRepo().ReadGitRepo(gr.Model.ID)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	// make sure id is 1
	if gr.Model.ID != 1 {
		t.Errorf("incorrect git repo ID: expected %d, got %d\n", 1, gr.Model.ID)
	}

	// reset fields for reflect.DeepEqual
	gr.Model = orm.Model{}

	if diff := deep.Equal(expGR, *gr); diff != nil {
		t.Errorf("incorrect git repo")
		t.Error(diff)
	}
}

func TestListGitReposByProjectID(t *testing.T) {
	tester := &tester{
		dbFileName: "./porter_list_grs.db",
	}

	setupTestEnv(tester, t)
	initGitRepo(tester, t)
	defer cleanup(tester, t)

	grs, err := tester.repo.GitRepo().ListGitReposByProjectID(
		tester.initProjects[0].Model.ID,
	)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	if len(grs) != 1 {
		t.Fatalf("length of oidc integrations incorrect: expected %d, got %d\n", 1, len(grs))
	}

	// make sure data is correct
	expGR := models.GitRepo{
		ProjectID:          tester.initProjects[0].ID,
		RepoEntity:         "porter-dev",
		OAuthIntegrationID: tester.initOAuths[0].ID,
	}

	gr := grs[0]

	// reset fields for reflect.DeepEqual
	gr.Model = orm.Model{}

	if diff := deep.Equal(expGR, *gr); diff != nil {
		t.Errorf("incorrect git repo")
		t.Error(diff)
	}
}

func TestUpdateGitRepo(t *testing.T) {
	tester := &tester{
		dbFileName: "./porter_update_gr.db",
	}

	setupTestEnv(tester, t)
	initProject(tester, t)
	initGitRepo(tester, t)
	defer cleanup(tester, t)

	gr := tester.initGRs[0]

	gr.RepoEntity = "porter-dev-new-name"

	gr, err := tester.repo.GitRepo().UpdateGitRepo(
		gr,
	)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	gr, err = tester.repo.GitRepo().ReadGitRepo(tester.initGRs[0].ID)

	// make sure data is correct
	expGR := models.GitRepo{
		RepoEntity:         "porter-dev-new-name",
		ProjectID:          tester.initProjects[0].Model.ID,
		OAuthIntegrationID: tester.initOAuths[0].ID,
	}

	// reset fields for reflect.DeepEqual
	gr.Model = orm.Model{}

	if diff := deep.Equal(expGR, *gr); diff != nil {
		t.Errorf("incorrect git repo")
		t.Error(diff)
	}
}
