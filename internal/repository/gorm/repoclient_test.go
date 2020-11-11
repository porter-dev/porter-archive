package gorm_test

import (
	"testing"

	"github.com/go-test/deep"
	"github.com/porter-dev/porter/internal/models"
	orm "gorm.io/gorm"
)

func TestCreateRepoClient(t *testing.T) {
	tester := &tester{
		dbFileName: "./porter_create_rc.db",
	}

	setupTestEnv(tester, t)
	initUser(tester, t)
	initProject(tester, t)
	defer cleanup(tester, t)

	repoClient := &models.RepoClient{
		ProjectID:    tester.initProjects[0].ID,
		UserID:       tester.initUsers[0].ID,
		RepoUserID:   1,
		Kind:         models.RepoClientGithub,
		AccessToken:  "accesstoken1234",
		RefreshToken: "refreshtoken1234",
	}

	repoClient, err := tester.repo.RepoClient.CreateRepoClient(repoClient)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	repoClient, err = tester.repo.RepoClient.ReadRepoClient(repoClient.Model.ID)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	// make sure id is 1
	if repoClient.Model.ID != 1 {
		t.Errorf("incorrect repo client ID: expected %d, got %d\n", 1, repoClient.Model.ID)
	}

	// make sure data is correct
	expRepoClient := &models.RepoClient{
		ProjectID:    tester.initProjects[0].ID,
		UserID:       tester.initUsers[0].ID,
		RepoUserID:   1,
		Kind:         models.RepoClientGithub,
		AccessToken:  "accesstoken1234",
		RefreshToken: "refreshtoken1234",
	}

	copyRepoClient := repoClient

	// reset fields for reflect.DeepEqual
	copyRepoClient.Model = orm.Model{}

	if diff := deep.Equal(copyRepoClient, expRepoClient); diff != nil {
		t.Errorf("incorrect repo client")
		t.Error(diff)
	}
}

func TestListRepoClientsByProjectID(t *testing.T) {
	tester := &tester{
		dbFileName: "./porter_list_rcs.db",
	}

	setupTestEnv(tester, t)
	initUser(tester, t)
	initProject(tester, t)
	initServiceAccount(tester, t)
	initRepoClient(tester, t)
	defer cleanup(tester, t)

	rcs, err := tester.repo.RepoClient.ListRepoClientsByProjectID(
		tester.initProjects[0].Model.ID,
	)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	if len(rcs) != 1 {
		t.Fatalf("length of rcs incorrect: expected %d, got %d\n", 1, len(rcs))
	}

	// make sure data is correct
	// make sure data is correct
	expRepoClient := &models.RepoClient{
		ProjectID:    tester.initProjects[0].ID,
		UserID:       tester.initUsers[0].ID,
		RepoUserID:   1,
		Kind:         models.RepoClientGithub,
		AccessToken:  "accesstoken1234",
		RefreshToken: "refreshtoken1234",
	}

	copyRepoClient := rcs[0]

	// reset fields for reflect.DeepEqual
	copyRepoClient.Model = orm.Model{}

	if diff := deep.Equal(copyRepoClient, expRepoClient); diff != nil {
		t.Errorf("incorrect repo client")
		t.Error(diff)
	}
}
