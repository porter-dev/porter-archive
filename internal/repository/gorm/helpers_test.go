package gorm_test

import (
	"os"
	"testing"

	"github.com/porter-dev/porter/internal/adapter"
	"github.com/porter-dev/porter/internal/config"
	"github.com/porter-dev/porter/internal/models"
	ints "github.com/porter-dev/porter/internal/models/integrations"
	"github.com/porter-dev/porter/internal/repository"
	"github.com/porter-dev/porter/internal/repository/gorm"
)

type tester struct {
	repo         *repository.Repository
	key          *[32]byte
	dbFileName   string
	initUsers    []*models.User
	initProjects []*models.Project
	initGRs      []*models.GitRepo
	initKIs      []*ints.KubeIntegration
	initOIDCs    []*ints.OIDCIntegration
	initOAuths   []*ints.OAuthIntegration
	initGCPs     []*ints.GCPIntegration
	initAWSs     []*ints.AWSIntegration
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
		&models.User{},
		&models.Session{},
		&models.GitRepo{},
		&ints.KubeIntegration{},
		&ints.OIDCIntegration{},
		&ints.OAuthIntegration{},
		&ints.GCPIntegration{},
		&ints.AWSIntegration{},
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

func initProjectRole(tester *tester, t *testing.T) {
	t.Helper()

	role := &models.Role{
		Kind:      models.RoleAdmin,
		UserID:    tester.initUsers[0].Model.ID,
		ProjectID: tester.initProjects[0].Model.ID,
	}

	role, err := tester.repo.Project.CreateProjectRole(tester.initProjects[0], role)

	if err != nil {
		t.Fatalf("%v\n", err)
	}
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
		Mechanism:  ints.KubeLocal,
		ProjectID:  tester.initProjects[0].ID,
		UserID:     tester.initUsers[0].ID,
		Kubeconfig: []byte("current-context: testing\n"),
	}

	ki, err := tester.repo.KubeIntegration.CreateKubeIntegration(ki)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	tester.initKIs = append(tester.initKIs, ki)
}

func initOIDCIntegration(tester *tester, t *testing.T) {
	t.Helper()

	if len(tester.initProjects) == 0 {
		initProject(tester, t)
	}

	if len(tester.initUsers) == 0 {
		initUser(tester, t)
	}

	oidc := &ints.OIDCIntegration{
		Client:       ints.OIDCKube,
		ProjectID:    tester.initProjects[0].ID,
		UserID:       tester.initUsers[0].ID,
		IssuerURL:    []byte("https://oidc.example.com"),
		ClientID:     []byte("exampleclientid"),
		ClientSecret: []byte("exampleclientsecret"),
		IDToken:      []byte("idtoken"),
		RefreshToken: []byte("refreshtoken"),
	}

	oidc, err := tester.repo.OIDCIntegration.CreateOIDCIntegration(oidc)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	tester.initOIDCs = append(tester.initOIDCs, oidc)
}

func initOAuthIntegration(tester *tester, t *testing.T) {
	t.Helper()

	if len(tester.initProjects) == 0 {
		initProject(tester, t)
	}

	if len(tester.initUsers) == 0 {
		initUser(tester, t)
	}

	oauth := &ints.OAuthIntegration{
		Client:       ints.OAuthGithub,
		ProjectID:    tester.initProjects[0].ID,
		UserID:       tester.initUsers[0].ID,
		ClientID:     []byte("exampleclientid"),
		AccessToken:  []byte("idtoken"),
		RefreshToken: []byte("refreshtoken"),
	}

	oauth, err := tester.repo.OAuthIntegration.CreateOAuthIntegration(oauth)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	tester.initOAuths = append(tester.initOAuths, oauth)
}

func initGCPIntegration(tester *tester, t *testing.T) {
	t.Helper()

	if len(tester.initProjects) == 0 {
		initProject(tester, t)
	}

	if len(tester.initUsers) == 0 {
		initUser(tester, t)
	}

	gcp := &ints.GCPIntegration{
		ProjectID:    tester.initProjects[0].ID,
		UserID:       tester.initUsers[0].ID,
		GCPProjectID: "test-proj-123456",
		GCPUserEmail: "test@test.it",
		GCPKeyData:   []byte("{\"test\":\"key\"}"),
	}

	gcp, err := tester.repo.GCPIntegration.CreateGCPIntegration(gcp)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	tester.initGCPs = append(tester.initGCPs, gcp)
}

func initAWSIntegration(tester *tester, t *testing.T) {
	t.Helper()

	if len(tester.initProjects) == 0 {
		initProject(tester, t)
	}

	if len(tester.initUsers) == 0 {
		initUser(tester, t)
	}

	aws := &ints.AWSIntegration{
		ProjectID:          tester.initProjects[0].ID,
		UserID:             tester.initUsers[0].ID,
		AWSEntityID:        "entity",
		AWSCallerID:        "caller",
		AWSClusterID:       []byte("example-cluster-0"),
		AWSAccessKeyID:     []byte("accesskey"),
		AWSSecretAccessKey: []byte("secret"),
		AWSSessionToken:    []byte("optional"),
	}

	aws, err := tester.repo.AWSIntegration.CreateAWSIntegration(aws)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	tester.initAWSs = append(tester.initAWSs, aws)
}

// func initServiceAccountCandidate(tester *tester, t *testing.T) {
// 	t.Helper()

// 	saCandidate := &models.ServiceAccountCandidate{
// 		ProjectID:       1,
// 		Kind:            "connector",
// 		ClusterName:     "cluster-test",
// 		ClusterEndpoint: "https://localhost",
// 		Integration:   models.X509,
// 		Kubeconfig:      []byte("current-context: testing\n"),
// 		Actions: []models.ServiceAccountAction{
// 			models.ServiceAccountAction{
// 				Name:     models.TokenDataAction,
// 				Resolved: false,
// 			},
// 		},
// 	}

// 	saCandidate, err := tester.repo.ServiceAccount.CreateServiceAccountCandidate(saCandidate)

// 	if err != nil {
// 		t.Fatalf("%v\n", err)
// 	}

// 	tester.initSACandidates = append(tester.initSACandidates, saCandidate)
// }

// func initServiceAccount(tester *tester, t *testing.T) {
// 	t.Helper()

// 	sa := &models.ServiceAccount{
// 		ProjectID:             1,
// 		Kind:                  "connector",
// 		Integration:         models.X509,
// 		ClientCertificateData: []byte("-----BEGIN"),
// 		ClientKeyData:         []byte("-----BEGIN"),
// 		Clusters: []models.Cluster{
// 			models.Cluster{
// 				Name:                     "cluster-test",
// 				Server:                   "https://localhost",
// 				CertificateAuthorityData: []byte("-----BEGIN"),
// 			},
// 		},
// 	}

// 	sa, err := tester.repo.ServiceAccount.CreateServiceAccount(sa)

// 	if err != nil {
// 		t.Fatalf("%v\n", err)
// 	}

// 	tester.initSAs = append(tester.initSAs, sa)
// }

func initGitRepo(tester *tester, t *testing.T) {
	t.Helper()

	// rc := &models.GitRepo{
	// 	ProjectID:    tester.initProjects[0].ID,
	// 	UserID:       tester.initUsers[0].ID,
	// 	RepoUserID:   1,
	// 	Kind:         models.RepoClientGithub,
	// 	AccessToken:  []byte("accesstoken1234"),
	// 	RefreshToken: []byte("refreshtoken1234"),
	// }

	// rc, err := tester.repo.RepoClient.CreateRepoClient(rc)

	// if err != nil {
	// 	t.Fatalf("%v\n", err)
	// }

	// tester.initRCs = append(tester.initRCs, rc)
}
