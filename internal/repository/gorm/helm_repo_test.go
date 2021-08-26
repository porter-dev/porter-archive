package gorm_test

import (
	"testing"
	"time"

	"github.com/go-test/deep"
	"github.com/porter-dev/porter/internal/models"
	ints "github.com/porter-dev/porter/internal/models/integrations"
	"gorm.io/gorm"
	orm "gorm.io/gorm"
)

func TestCreateHelmRepo(t *testing.T) {
	tester := &tester{
		dbFileName: "./porter_create_hr.db",
	}

	setupTestEnv(tester, t)
	initProject(tester, t)
	defer cleanup(tester, t)

	hr := &models.HelmRepo{
		Name:      "helm-repo-test",
		RepoURL:   "https://example-repo.com",
		ProjectID: tester.initProjects[0].Model.ID,
	}

	hr, err := tester.repo.HelmRepo().CreateHelmRepo(hr)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	hr, err = tester.repo.HelmRepo().ReadHelmRepo(tester.initProjects[0].Model.ID, hr.Model.ID)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	// make sure id is 1 and name is "registry-test"
	if hr.Model.ID != 1 {
		t.Errorf("incorrect registry ID: expected %d, got %d\n", 1, hr.Model.ID)
	}

	if hr.Name != "helm-repo-test" {
		t.Errorf("incorrect helm repo name: expected %s, got %s\n", "helm-repo-test", hr.Name)
	}

	if hr.RepoURL != "https://example-repo.com" {
		t.Errorf("incorrect helm repo url: expected %s, got %s\n", "https://example-repo.com", hr.RepoURL)
	}
}

func TestListHelmReposByProjectID(t *testing.T) {
	tester := &tester{
		dbFileName: "./porter_list_hrs.db",
	}

	setupTestEnv(tester, t)
	initProject(tester, t)
	initHelmRepo(tester, t)
	defer cleanup(tester, t)

	hrs, err := tester.repo.HelmRepo().ListHelmReposByProjectID(
		tester.initProjects[0].Model.ID,
	)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	if len(hrs) != 1 {
		t.Fatalf("length of helm repos incorrect: expected %d, got %d\n", 1, len(hrs))
	}

	// make sure data is correct
	expHelmRepo := models.HelmRepo{
		Name:      "helm-repo-test",
		RepoURL:   "https://example-repo.com",
		ProjectID: tester.initProjects[0].Model.ID,
	}

	hr := hrs[0]

	// reset fields for reflect.DeepEqual
	hr.Model = gorm.Model{}

	if diff := deep.Equal(expHelmRepo, *hr); diff != nil {
		t.Errorf("incorrect helm repo")
		t.Error(diff)
	}
}

func TestUpdateHelmRepo(t *testing.T) {
	tester := &tester{
		dbFileName: "./porter_update_hr.db",
	}

	setupTestEnv(tester, t)
	initProject(tester, t)
	initHelmRepo(tester, t)
	defer cleanup(tester, t)

	hr := tester.initHRs[0]

	hr.Name = "helm-repo-new-name"

	hr, err := tester.repo.HelmRepo().UpdateHelmRepo(
		hr,
	)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	hr, err = tester.repo.HelmRepo().ReadHelmRepo(tester.initProjects[0].Model.ID, tester.initHRs[0].ID)

	// make sure data is correct
	expHelmRepo := models.HelmRepo{
		Name:      "helm-repo-new-name",
		RepoURL:   "https://example-repo.com",
		ProjectID: tester.initProjects[0].Model.ID,
	}

	// reset fields for reflect.DeepEqual
	hr.Model = orm.Model{}

	if diff := deep.Equal(expHelmRepo, *hr); diff != nil {
		t.Errorf("incorrect helm repo")
		t.Error(diff)
	}
}

func TestUpdateHelmRepoToken(t *testing.T) {
	tester := &tester{
		dbFileName: "./porter_test_update_hr_token.db",
	}

	setupTestEnv(tester, t)
	initProject(tester, t)
	defer cleanup(tester, t)

	hr := &models.HelmRepo{
		Name:      "helm-repo-test",
		RepoURL:   "https://example-repo.com",
		ProjectID: tester.initProjects[0].Model.ID,
		TokenCache: ints.HelmRepoTokenCache{
			TokenCache: ints.TokenCache{
				Token:  []byte("token-1"),
				Expiry: time.Now().Add(-1 * time.Hour),
			},
		},
	}

	hr, err := tester.repo.HelmRepo().CreateHelmRepo(hr)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	hr, err = tester.repo.HelmRepo().ReadHelmRepo(tester.initProjects[0].Model.ID, hr.Model.ID)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	// make sure helm repo id of token is 1
	if hr.TokenCache.HelmRepoID != 1 {
		t.Fatalf("incorrect helm repo id in token cache: expected %d, got %d\n", 1, hr.TokenCache.HelmRepoID)
	}

	// make sure old token is expired
	if isExpired := hr.TokenCache.IsExpired(); !isExpired {
		t.Fatalf("token was not expired\n")
	}

	if string(hr.TokenCache.Token) != "token-1" {
		t.Errorf("incorrect token in cache: expected %s, got %s\n", "token-1", hr.TokenCache.Token)
	}

	hr.TokenCache.Token = []byte("token-2")
	hr.TokenCache.Expiry = time.Now().Add(24 * time.Hour)

	hr, err = tester.repo.HelmRepo().UpdateHelmRepoTokenCache(&hr.TokenCache)
	if err != nil {
		t.Fatalf("%v\n", err)
	}
	hr, err = tester.repo.HelmRepo().ReadHelmRepo(tester.initProjects[0].Model.ID, hr.Model.ID)
	if err != nil {
		t.Fatalf("%v\n", err)
	}

	// make sure id is 1
	if hr.Model.ID != 1 {
		t.Errorf("incorrect helm repo ID: expected %d, got %d\n", 1, hr.Model.ID)
	}

	// make sure new token is correct and not expired
	if hr.TokenCache.HelmRepoID != 1 {
		t.Fatalf("incorrect helm repo ID in token cache: expected %d, got %d\n", 1, hr.TokenCache.HelmRepoID)
	}

	if isExpired := hr.TokenCache.IsExpired(); isExpired {
		t.Fatalf("token was expired\n")
	}

	if string(hr.TokenCache.Token) != "token-2" {
		t.Errorf("incorrect token in cache: expected %s, got %s\n", "token-2", hr.TokenCache.Token)
	}
}

// func TestDeleteRegistry(t *testing.T) {
// 	tester := &tester{
// 		dbFileName: "./porter_delete_registry.db",
// 	}

// 	setupTestEnv(tester, t)
// 	initProject(tester, t)
// 	initRegistry(tester, t)
// 	defer cleanup(tester, t)

// 	reg, err := tester.repo.Registry().ReadRegistry(tester.initRegs[0].Model.ID)

// 	if err != nil {
// 		t.Fatalf("%v\n", err)
// 	}

// 	err = tester.repo.Registry().DeleteRegistry(reg)

// 	if err != nil {
// 		t.Fatalf("%v\n", err)
// 	}

// 	_, err = tester.repo.Registry().ReadRegistry(tester.initRegs[0].Model.ID)

// 	if err != orm.ErrRecordNotFound {
// 		t.Fatalf("incorrect error: expected %v, got %v\n", orm.ErrRecordNotFound, err)
// 	}

// 	regs, err := tester.repo.Registry().ListRegistriesByProjectID(tester.initProjects[0].Model.ID)

// 	if err != nil {
// 		t.Fatalf("%v\n", err)
// 	}

// 	if len(regs) != 0 {
// 		t.Fatalf("length of clusters was not 0")
// 	}
// }
