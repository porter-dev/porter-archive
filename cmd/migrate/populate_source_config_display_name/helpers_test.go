package populate_source_config_display_name_test

import (
	"fmt"
	"os"
	"testing"
	"time"

	"github.com/porter-dev/porter/api/server/shared/config/env"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/adapter"
	"github.com/porter-dev/porter/internal/encryption"
	"github.com/porter-dev/porter/internal/models"
	ints "github.com/porter-dev/porter/internal/models/integrations"
	"github.com/porter-dev/porter/internal/repository"
	"github.com/porter-dev/porter/internal/repository/gorm"
	_gorm "gorm.io/gorm"
)

type tester struct {
	Key *[32]byte
	DB  *_gorm.DB

	repo         repository.Repository
	dbFileName   string
	key          *[32]byte
	initUsers    []*models.User
	initProjects []*models.Project
	initClusters []*models.Cluster
	initKIs      []*ints.KubeIntegration
	initStacks   []*models.Stack
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
		&models.Stack{},
		&models.StackEnvGroup{},
		&models.StackSourceConfig{},
		&models.StackRevision{},
		&models.StackResource{},
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

	if len(tester.initProjects) == 0 {
		initProject(tester, t)
	}

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

func initProject(tester *tester, t *testing.T) {
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

	if len(tester.initProjects) == 0 {
		initProject(tester, t)
	}

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

func initEmptyStack(tester *tester, t *testing.T, stackName string) {
	t.Helper()

	if len(tester.initProjects) == 0 {
		initProject(tester, t)
	}

	if len(tester.initUsers) == 0 {
		initUser(tester, t)
	}

	if len(tester.initClusters) == 0 {
		initCluster(tester, t)
	}

	uid, _ := encryption.GenerateRandomBytes(16)

	// write stack to the database with creating status
	stack := &models.Stack{
		ProjectID: tester.initProjects[0].ID,
		ClusterID: tester.initClusters[0].ID,
		Namespace: "test-namespace",
		Name:      stackName,
		UID:       uid,
		Revisions: []models.StackRevision{
			{
				RevisionNumber: 1,
				Status:         string(types.StackRevisionStatusDeploying),
				SourceConfigs:  []models.StackSourceConfig{},
			},
		},
	}

	newStack, err := tester.repo.Stack().CreateStack(stack)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	tester.initStacks = append(tester.initStacks, newStack)
}

func initStack(tester *tester, t *testing.T, stackName string) {
	t.Helper()

	if len(tester.initProjects) == 0 {
		initProject(tester, t)
	}

	if len(tester.initUsers) == 0 {
		initUser(tester, t)
	}

	if len(tester.initClusters) == 0 {
		initCluster(tester, t)
	}

	uid, _ := encryption.GenerateRandomBytes(16)

	sourceConfigs := []models.StackSourceConfig{
		{
			Name:         "source-config-1",
			ImageRepoURI: "some-repo",
			ImageTag:     "some-tag",
			UID:          uid,
		},
	}

	// write stack to the database with creating status
	stack := &models.Stack{
		ProjectID: tester.initProjects[0].ID,
		ClusterID: tester.initClusters[0].ID,
		Namespace: "test-namespace",
		Name:      stackName,
		UID:       uid,
		Revisions: []models.StackRevision{
			{
				RevisionNumber: 1,
				Status:         string(types.StackRevisionStatusDeploying),
				SourceConfigs:  sourceConfigs,
			},
		},
	}

	newStack, err := tester.repo.Stack().CreateStack(stack)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	tester.initStacks = append(tester.initStacks, newStack)
}

func createNewStackRevision(tester *tester, t *testing.T, stackName string) {
	t.Helper()

	if len(tester.initProjects) == 0 {
		initProject(tester, t)
	}
	if len(tester.initUsers) == 0 {
		initUser(tester, t)
	}
	if len(tester.initClusters) == 0 {
		initCluster(tester, t)
	}
	if len(tester.initStacks) == 0 {
		initStack(tester, t, stackName)
	}

	stack := tester.initStacks[0]

	for _, s := range tester.initStacks {
		if s.Name == stackName {
			stack = s
			break
		}
	}

	prevRevision := findLatestRevisionByRevisionNumber(t, stack.Revisions)

	oldSourceConfig := prevRevision.SourceConfigs[0]

	newUid, _ := encryption.GenerateRandomBytes(16)
	sourceConfigs := []models.StackSourceConfig{
		{
			Name:         oldSourceConfig.Name,
			ImageRepoURI: "some-repo-" + fmt.Sprint(prevRevision.RevisionNumber+1),
			ImageTag:     "some-tag-" + fmt.Sprint(prevRevision.RevisionNumber+1),
			UID:          newUid,
		},
	}

	newRevision := models.StackRevision{
		RevisionNumber: prevRevision.RevisionNumber + 1,
		Status:         string(types.StackRevisionStatusDeploying),
		SourceConfigs:  sourceConfigs,
		StackID:        stack.ID,
	}

	tester.repo.Stack().AppendNewRevision(&newRevision)
}

func findLatestRevisionByRevisionNumber(t *testing.T, revisions []models.StackRevision) *models.StackRevision {
	t.Helper()

	latestRevision := revisions[0]
	for _, revision := range revisions {
		if revision.RevisionNumber > latestRevision.RevisionNumber {
			latestRevision = revision
		}
	}

	return &latestRevision
}

func appendNewSourceConfig(t *testing.T, tester *tester, stack *models.Stack, sourceConfig models.StackSourceConfig) {
	t.Helper()

	prevRevision := findLatestRevisionByRevisionNumber(t, stack.Revisions)

	previousSourceConfigs := []models.StackSourceConfig{}

	for _, sourceConfig := range prevRevision.SourceConfigs {
		newUid, _ := encryption.GenerateRandomBytes(16)

		sc := models.StackSourceConfig{
			Name:         sourceConfig.Name,
			ImageRepoURI: sourceConfig.ImageRepoURI,
			ImageTag:     sourceConfig.ImageTag,
			UID:          newUid,
		}
		previousSourceConfigs = append(previousSourceConfigs, sc)
	}

	newRevision := models.StackRevision{
		RevisionNumber: prevRevision.RevisionNumber + 1,
		Status:         string(types.StackRevisionStatusDeploying),
		SourceConfigs:  append(prevRevision.SourceConfigs, sourceConfig),
		StackID:        stack.ID,
	}

	tester.repo.Stack().AppendNewRevision(&newRevision)
}
