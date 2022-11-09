package enable_cluster_preview_envs

import (
	"os"
	"testing"
	"time"

	"github.com/porter-dev/porter/api/server/shared/config/env"
	"github.com/porter-dev/porter/internal/adapter"
	"github.com/porter-dev/porter/internal/models"
	ints "github.com/porter-dev/porter/internal/models/integrations"
	"github.com/porter-dev/porter/internal/repository"
	"github.com/porter-dev/porter/internal/repository/gorm"
	_gorm "gorm.io/gorm"
)

type tester struct {
	Key *[32]byte
	DB  *_gorm.DB

	repo       repository.Repository
	dbFileName string
	key        *[32]byte

	initUsers    []*models.User
	initProjects []*models.Project
	initClusters []*models.Cluster
	initKIs      []*ints.KubeIntegration
}

func setupTestEnv(tester *tester, t *testing.T) {
	t.Helper()

	db, err := adapter.New(&env.DBConf{
		EncryptionKey: "__random_strong_encryption_key__",
		SQLLite:       true,
		SQLLitePath:   tester.dbFileName,
	})

	if err != nil {
		t.Fatalf("%\n", err)
	}

	err = db.AutoMigrate(
		&models.Project{},
		&models.User{},
		&models.Cluster{},
		&ints.KubeIntegration{},
		&ints.ClusterTokenCache{},
	)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	var key [32]byte

	for i, b := range []byte("__random_strong_encryption_key__") {
		key[i] = b
	}

	tester.key = &key
	tester.Key = &key
	tester.DB = db

	tester.repo = gorm.NewRepository(db, &key, nil)
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

	user, err := tester.repo.User().CreateUser(user)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	tester.initUsers = append(tester.initUsers, user)
}

func initCluster(tester *tester, t *testing.T) {
	t.Helper()

	if len(tester.initKIs) == 0 {
		initKubeIntegration(tester, t)
	}

	cluster := &models.Cluster{
		ProjectID:                tester.initProjects[0].ID,
		Name:                     "cluster-test",
		Server:                   "https://localhost",
		KubeIntegrationID:        tester.initKIs[0].ID,
		CertificateAuthorityData: []byte("-----BEGIN"),
		TokenCache: ints.ClusterTokenCache{
			TokenCache: ints.TokenCache{
				Token:  []byte("token-1"),
				Expiry: time.Now().Add(-1 * time.Hour),
			},
		},
	}

	cluster, err := tester.repo.Cluster().CreateCluster(cluster)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	tester.initClusters = append(tester.initClusters, cluster)
}

func initProjectPreviewEnabled(tester *tester, t *testing.T) {
	t.Helper()

	proj := &models.Project{
		Name:               "project-test",
		PreviewEnvsEnabled: true,
	}

	proj, err := tester.repo.Project().CreateProject(proj)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	tester.initProjects = append(tester.initProjects, proj)
}

func initProjectPreviewDisabled(tester *tester, t *testing.T) {
	t.Helper()

	proj := &models.Project{
		Name: "project-test",
	}

	proj, err := tester.repo.Project().CreateProject(proj)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	tester.initProjects = append(tester.initProjects, proj)
}

func initKubeIntegration(tester *tester, t *testing.T) {
	t.Helper()

	if len(tester.initUsers) == 0 {
		initUser(tester, t)
	}

	ki := &ints.KubeIntegration{
		Mechanism:             ints.KubeLocal,
		ProjectID:             tester.initProjects[0].ID,
		UserID:                tester.initUsers[0].ID,
		Kubeconfig:            []byte("current-context: testing\n"),
		ClientCertificateData: []byte("clientcertdata"),
		ClientKeyData:         []byte("clientkeydata"),
		Token:                 []byte("token"),
		Username:              []byte("username"),
		Password:              []byte("password"),
	}

	ki, err := tester.repo.KubeIntegration().CreateKubeIntegration(ki)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	tester.initKIs = append(tester.initKIs, ki)
}
