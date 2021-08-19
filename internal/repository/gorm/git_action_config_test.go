package gorm_test

import (
	"testing"

	"github.com/go-test/deep"
	"github.com/porter-dev/porter/internal/models"
	orm "gorm.io/gorm"
)

func TestCreateGitActionConfig(t *testing.T) {
	tester := &tester{
		dbFileName: "./porter_create_ga.db",
	}

	setupTestEnv(tester, t)
	initUser(tester, t)
	initProject(tester, t)
	initRelease(tester, t)
	defer cleanup(tester, t)

	ga := &models.GitActionConfig{
		ReleaseID:            1,
		GitRepo:              "porter-dev/porter",
		ImageRepoURI:         "gcr.io/project-123456/nginx",
		GithubInstallationID: 1,
	}

	expGA := *ga

	ga, err := tester.repo.GitActionConfig().CreateGitActionConfig(ga)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	ga, err = tester.repo.GitActionConfig().ReadGitActionConfig(ga.Model.ID)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	// make sure id is 1
	if ga.Model.ID != 1 {
		t.Errorf("incorrect git repo ID: expected %d, got %d\n", 1, ga.Model.ID)
	}

	// reset fields for reflect.DeepEqual
	ga.Model = orm.Model{}

	if diff := deep.Equal(expGA, *ga); diff != nil {
		t.Errorf("incorrect git action config")
		t.Error(diff)
	}

	// read the release and make sure GitActionConfig is expected
	release, err := tester.repo.Release().ReadRelease(1, "denver-meister-dakota", "default")

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	gotReleaseGA := release.GitActionConfig
	gotReleaseGA.Model = orm.Model{}

	if diff := deep.Equal(expGA, gotReleaseGA); diff != nil {
		t.Errorf("incorrect git action config")
		t.Error(diff)
	}
}
