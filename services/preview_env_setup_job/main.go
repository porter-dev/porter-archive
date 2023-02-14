package main

import (
	"encoding/json"
	"log"
	"time"

	"github.com/joeshaw/envdecode"
	"github.com/porter-dev/porter/api/server/shared/config/env"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/adapter"
	"github.com/porter-dev/porter/internal/models"
	"golang.org/x/crypto/bcrypt"

	rcreds "github.com/porter-dev/porter/internal/repository/credentials"
	"github.com/porter-dev/porter/internal/repository/gorm"
	pgorm "github.com/porter-dev/porter/internal/repository/gorm"
)

type EnvConf struct {
	env.DBConf
	env.ServerConf
}

func main() {
	conf := EnvConf{}

	if err := envdecode.StrictDecode(&conf); err != nil {
		log.Fatalf("Failed to decode DB conf: %v", err)
	}

	db, err := adapter.New(&conf.DBConf)

	if err != nil {
		log.Fatalf("Failed to create DB adapter: %v", err)
	}

	err = gorm.AutoMigrate(db, false)

	if err != nil {
		log.Fatalf("Failed to auto migrate DB: %v", err)
	}

	var credBackend rcreds.CredentialStorage

	var key [32]byte

	for i, b := range []byte(conf.EncryptionKey) {
		key[i] = b
	}

	repo := pgorm.NewRepository(db, &key, credBackend)

	log.Println("Creating test user")

	hashedPW, err := bcrypt.GenerateFromPassword([]byte("test"), 8)

	if err != nil {
		log.Fatalf("Failed to hash password: %v", err)
	}

	user, err := repo.User().CreateUser(&models.User{
		Email:         "test@test.com",
		Password:      string(hashedPW),
		EmailVerified: true,
	})

	if err != nil {
		log.Fatalf("Failed to create test user: %v", err)
	}

	log.Println("Creating test project")

	proj, err := repo.Project().CreateProject(&models.Project{
		Name:               "test-project",
		PreviewEnvsEnabled: true,
		APITokensEnabled:   true,
	})

	if err != nil {
		log.Fatalf("Failed to create test project: %v", err)
	}

	log.Println("Adding test user as admin to test project")

	_, err = repo.Project().CreateProjectRole(proj, &models.Role{
		Role: types.Role{
			Kind:      types.RoleAdmin,
			UserID:    user.ID,
			ProjectID: proj.ID,
		},
	})

	if err != nil {
		log.Fatalf("Failed to add test user as admin to test project: %v", err)
	}

	policyBytes, err := json.Marshal(types.AdminPolicy)

	if err != nil {
		log.Fatalf("Failed to JSON marshal admin policy: %v", err)
	}

	policy, err := repo.Policy().CreatePolicy(&models.Policy{
		UniqueID:        "test-user-admin-policy",
		ProjectID:       proj.ID,
		CreatedByUserID: user.ID,
		Name:            "Admin Policy",
		PolicyBytes:     policyBytes,
	})

	if err != nil {
		log.Fatalf("Failed to create admin policy: %v", err)
	}

	expiry := time.Now().Add(7 * 24 * time.Hour)

	secretKey := "volume-miss-king-master"

	_, err = repo.APIToken().CreateAPIToken(&models.APIToken{
		UniqueID:        "test-user-admin-token",
		ProjectID:       proj.ID,
		CreatedByUserID: user.ID,
		Expiry:          &expiry,
		PolicyUID:       policy.UniqueID,
		PolicyName:      policy.Name,
		Name:            "Admin Token",
		SecretKey:       []byte(secretKey),
	})

	if err != nil {
		log.Fatalf("Failed to create admin API token: %v", err)
	}

	log.Println("Successfully created test user, project, policy, and API token")
}
