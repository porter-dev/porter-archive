package gorm_test

import (
	"os"
	"testing"

	"github.com/porter-dev/porter/internal/adapter"
	"github.com/porter-dev/porter/internal/config"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"github.com/porter-dev/porter/internal/repository/gorm"
)

type tester struct {
	repo             *repository.Repository
	key              *[32]byte
	dbFileName       string
	initUsers        []*models.User
	initProjects     []*models.Project
	initSACandidates []*models.ServiceAccountCandidate
	initSAs          []*models.ServiceAccount
	initRCs          []*models.RepoClient
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
		&models.RepoClient{},
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

func initUser(tester *tester, t *testing.T) {
	t.Helper()

	user := &models.User{
		Email:    "example@example.com",
		Password: "hello1234",
	}

	user, err := tester.repo.User.CreateUser(user)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	tester.initUsers = append(tester.initUsers, user)
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

func initServiceAccountCandidate(tester *tester, t *testing.T) {
	t.Helper()

	saCandidate := &models.ServiceAccountCandidate{
		ProjectID:       1,
		Kind:            "connector",
		ClusterName:     "cluster-test",
		ClusterEndpoint: "https://localhost",
		AuthMechanism:   models.X509,
		Kubeconfig:      []byte("current-context: testing\n"),
		Actions: []models.ServiceAccountAction{
			models.ServiceAccountAction{
				Name:     models.TokenDataAction,
				Resolved: false,
			},
		},
	}

	saCandidate, err := tester.repo.ServiceAccount.CreateServiceAccountCandidate(saCandidate)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	tester.initSACandidates = append(tester.initSACandidates, saCandidate)
}

func initServiceAccount(tester *tester, t *testing.T) {
	t.Helper()

	sa := &models.ServiceAccount{
		ProjectID:             1,
		Kind:                  "connector",
		AuthMechanism:         models.X509,
		ClientCertificateData: []byte("-----BEGIN"),
		ClientKeyData:         []byte("-----BEGIN"),
		Clusters: []models.Cluster{
			models.Cluster{
				Name:                     "cluster-test",
				Server:                   "https://localhost",
				CertificateAuthorityData: []byte("-----BEGIN"),
			},
		},
	}

	sa, err := tester.repo.ServiceAccount.CreateServiceAccount(sa)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	tester.initSAs = append(tester.initSAs, sa)
}

func initRepoClient(tester *tester, t *testing.T) {
	t.Helper()

	rc := &models.RepoClient{
		ProjectID:    tester.initProjects[0].ID,
		UserID:       tester.initUsers[0].ID,
		RepoUserID:   1,
		Kind:         models.RepoClientGithub,
		AccessToken:  "accesstoken1234",
		RefreshToken: "refreshtoken1234",
	}

	rc, err := tester.repo.RepoClient.CreateRepoClient(rc)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	tester.initRCs = append(tester.initRCs, rc)
}
