package gorm_test

import (
	"testing"
	"time"

	"github.com/go-test/deep"
	"github.com/porter-dev/porter/internal/models"
	ints "github.com/porter-dev/porter/internal/models/integrations"
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
		IntTokenCache: ints.TokenCache{
			Token:  []byte("token-1"),
			Expiry: time.Now().Add(-1 * time.Hour),
		},
		DockerTokenCache: ints.RegTokenCache{
			Token:  []byte("docker-token-1"),
			Expiry: time.Now().Add(-1 * time.Hour),
		},
	}

	reg, err := tester.repo.Registry.CreateRegistry(reg)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	reg, err = tester.repo.Registry.ReadRegistry(reg.Model.ID)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	// make sure registry id of token is 1
	if reg.IntTokenCache.RegistryID != 1 {
		t.Fatalf("incorrect registry id in token cache: expected %d, got %d\n", 1, reg.IntTokenCache.RegistryID)
	}

	// make sure old token is expired
	if isExpired := reg.IntTokenCache.IsExpired(); !isExpired {
		t.Fatalf("token was not expired\n")
	}

	if string(reg.IntTokenCache.Token) != "token-1" {
		t.Errorf("incorrect token in cache: expected %s, got %s\n", "token-1", reg.IntTokenCache.Token)
	}

	reg.IntTokenCache.Token = []byte("token-2")
	reg.IntTokenCache.Expiry = time.Now().Add(24 * time.Hour)

	reg, err = tester.repo.Registry.UpdateRegistryIntTokenCache(&reg.IntTokenCache)
	if err != nil {
		t.Fatalf("%v\n", err)
	}
	reg, err = tester.repo.Registry.ReadRegistry(reg.Model.ID)
	if err != nil {
		t.Fatalf("%v\n", err)
	}

	// make sure id is 1
	if reg.Model.ID != 1 {
		t.Errorf("incorrect registry ID: expected %d, got %d\n", 1, reg.Model.ID)
	}

	// make sure new token is correct and not expired
	if reg.IntTokenCache.RegistryID != 1 {
		t.Fatalf("incorrect registry ID in token cache: expected %d, got %d\n", 1, reg.IntTokenCache.RegistryID)
	}

	if isExpired := reg.IntTokenCache.IsExpired(); isExpired {
		t.Fatalf("token was expired\n")
	}

	if string(reg.IntTokenCache.Token) != "token-2" {
		t.Errorf("incorrect token in cache: expected %s, got %s\n", "token-2", reg.IntTokenCache.Token)
	}

	// make sure registry id of docker token is 1
	if reg.DockerTokenCache.RegistryID != 1 {
		t.Fatalf("incorrect registry id in token cache: expected %d, got %d\n", 1, reg.DockerTokenCache.RegistryID)
	}

	// make sure old token is expired
	if isExpired := reg.DockerTokenCache.IsExpired(); !isExpired {
		t.Fatalf("token was not expired\n")
	}

	if string(reg.DockerTokenCache.Token) != "docker-token-1" {
		t.Errorf("incorrect token in cache: expected %s, got %s\n", "docker-token-1", reg.DockerTokenCache.Token)
	}

	reg.DockerTokenCache.Token = []byte("docker-token-2")
	reg.DockerTokenCache.Expiry = time.Now().Add(24 * time.Hour)

	reg, err = tester.repo.Registry.UpdateRegistryDockerTokenCache(&reg.DockerTokenCache)
	if err != nil {
		t.Fatalf("%v\n", err)
	}
	reg, err = tester.repo.Registry.ReadRegistry(reg.Model.ID)
	if err != nil {
		t.Fatalf("%v\n", err)
	}

	// make sure id is 1
	if reg.Model.ID != 1 {
		t.Errorf("incorrect registry ID: expected %d, got %d\n", 1, reg.Model.ID)
	}

	// make sure new token is correct and not expired
	if reg.DockerTokenCache.RegistryID != 1 {
		t.Fatalf("incorrect registry ID in token cache: expected %d, got %d\n", 1, reg.DockerTokenCache.RegistryID)
	}

	if isExpired := reg.DockerTokenCache.IsExpired(); isExpired {
		t.Fatalf("token was expired\n")
	}

	if string(reg.DockerTokenCache.Token) != "docker-token-2" {
		t.Errorf("incorrect token in cache: expected %s, got %s\n", "docker-token-2", reg.DockerTokenCache.Token)
	}
}
