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

	reg, err := tester.repo.Registry().CreateRegistry(reg)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	reg, err = tester.repo.Registry().ReadRegistry(tester.initProjects[0].Model.ID, reg.Model.ID)

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

	regs, err := tester.repo.Registry().ListRegistriesByProjectID(
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

func TestUpdateRegistry(t *testing.T) {
	tester := &tester{
		dbFileName: "./porter_update_registry.db",
	}

	setupTestEnv(tester, t)
	initProject(tester, t)
	initRegistry(tester, t)
	defer cleanup(tester, t)

	reg := tester.initRegs[0]

	reg.Name = "registry-new-name"

	reg, err := tester.repo.Registry().UpdateRegistry(
		reg,
	)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	reg, err = tester.repo.Registry().ReadRegistry(tester.initProjects[0].Model.ID, tester.initRegs[0].ID)

	// make sure data is correct
	expRegistry := models.Registry{
		ProjectID: tester.initProjects[0].ID,
		Name:      "registry-new-name",
	}

	// reset fields for reflect.DeepEqual
	reg.Model = orm.Model{}

	if diff := deep.Equal(expRegistry, *reg); diff != nil {
		t.Errorf("incorrect registry")
		t.Error(diff)
	}
}

func TestUpdateRegistryToken(t *testing.T) {
	tester := &tester{
		dbFileName: "./porter_test_update_registry_token.db",
	}

	setupTestEnv(tester, t)
	initProject(tester, t)
	defer cleanup(tester, t)

	reg := &models.Registry{
		Name:      "registry-test",
		ProjectID: tester.initProjects[0].Model.ID,
		TokenCache: ints.RegTokenCache{
			TokenCache: ints.TokenCache{
				Token:  []byte("token-1"),
				Expiry: time.Now().Add(-1 * time.Hour),
			},
		},
	}

	reg, err := tester.repo.Registry().CreateRegistry(reg)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	reg, err = tester.repo.Registry().ReadRegistry(tester.initProjects[0].Model.ID, reg.Model.ID)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	// make sure registry id of token is 1
	if reg.TokenCache.RegistryID != 1 {
		t.Fatalf("incorrect registry id in token cache: expected %d, got %d\n", 1, reg.TokenCache.RegistryID)
	}

	// make sure old token is expired
	if isExpired := reg.TokenCache.IsExpired(); !isExpired {
		t.Fatalf("token was not expired\n")
	}

	if string(reg.TokenCache.Token) != "token-1" {
		t.Errorf("incorrect token in cache: expected %s, got %s\n", "token-1", reg.TokenCache.Token)
	}

	reg.TokenCache.Token = []byte("token-2")
	reg.TokenCache.Expiry = time.Now().Add(24 * time.Hour)

	reg, err = tester.repo.Registry().UpdateRegistryTokenCache(&reg.TokenCache)
	if err != nil {
		t.Fatalf("%v\n", err)
	}
	reg, err = tester.repo.Registry().ReadRegistry(tester.initProjects[0].Model.ID, reg.Model.ID)
	if err != nil {
		t.Fatalf("%v\n", err)
	}

	// make sure id is 1
	if reg.Model.ID != 1 {
		t.Errorf("incorrect registry ID: expected %d, got %d\n", 1, reg.Model.ID)
	}

	// make sure new token is correct and not expired
	if reg.TokenCache.RegistryID != 1 {
		t.Fatalf("incorrect registry ID in token cache: expected %d, got %d\n", 1, reg.TokenCache.RegistryID)
	}

	if isExpired := reg.TokenCache.IsExpired(); isExpired {
		t.Fatalf("token was expired\n")
	}

	if string(reg.TokenCache.Token) != "token-2" {
		t.Errorf("incorrect token in cache: expected %s, got %s\n", "token-2", reg.TokenCache.Token)
	}
}

func TestDeleteRegistry(t *testing.T) {
	tester := &tester{
		dbFileName: "./porter_delete_registry.db",
	}

	setupTestEnv(tester, t)
	initProject(tester, t)
	initRegistry(tester, t)
	defer cleanup(tester, t)

	reg, err := tester.repo.Registry().ReadRegistry(tester.initProjects[0].Model.ID, tester.initRegs[0].Model.ID)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	err = tester.repo.Registry().DeleteRegistry(reg)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	_, err = tester.repo.Registry().ReadRegistry(tester.initProjects[0].Model.ID, tester.initRegs[0].Model.ID)

	if err != orm.ErrRecordNotFound {
		t.Fatalf("incorrect error: expected %v, got %v\n", orm.ErrRecordNotFound, err)
	}

	regs, err := tester.repo.Registry().ListRegistriesByProjectID(tester.initProjects[0].Model.ID)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	if len(regs) != 0 {
		t.Fatalf("length of clusters was not 0")
	}
}
