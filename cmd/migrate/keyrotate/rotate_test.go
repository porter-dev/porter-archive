package keyrotate_test

import (
	"testing"

	"github.com/porter-dev/porter/cmd/migrate/keyrotate"
	"github.com/porter-dev/porter/internal/models"
	ints "github.com/porter-dev/porter/internal/models/integrations"
	gorm "github.com/porter-dev/porter/internal/repository/gorm"
)

func TestClusterModelRotation(t *testing.T) {
	var newKey [32]byte

	for i, b := range []byte("__r3n3o3_s3r3n3_3n3r3p3i3n_k3y__") {
		newKey[i] = b
	}

	tester := &tester{
		dbFileName: "./porter_cluster_rotate.db",
	}

	setupTestEnv(tester, t)

	for i := 0; i < 128; i++ {
		initCluster(tester, t)
	}

	defer cleanup(tester, t)

	err := keyrotate.Rotate(tester.DB, tester.Key, &newKey)

	if err != nil {
		t.Fatalf("error rotating: %v\n", err)
	}

	// very all clusters decoded properly
	repo := gorm.NewClusterRepository(tester.DB, &newKey).(*gorm.ClusterRepository)

	clusters := []*models.Cluster{}

	if err := tester.DB.Find(&clusters).Error; err != nil {
		t.Fatalf("%v\n", err)
	}

	// decrypt with the old key
	for _, c := range clusters {
		cluster, err := repo.ReadCluster(c.ProjectID, c.ID)

		if err != nil {
			t.Fatalf("error reading cluster: %v\n", err)
		}

		if string(cluster.CertificateAuthorityData) != "-----BEGIN" {
			t.Errorf("%s\n", string(cluster.CertificateAuthorityData))
		}

		if string(cluster.TokenCache.Token) != "token-1" {
			t.Errorf("%s\n", string(cluster.TokenCache.Token))
		}
	}
}

func TestClusterCandidateModelRotation(t *testing.T) {
	var newKey [32]byte

	for i, b := range []byte("__r3n3o3_s3r3n3_3n3r3p3i3n_k3y__") {
		newKey[i] = b
	}

	tester := &tester{
		dbFileName: "./porter_cluster_candidate_rotate.db",
	}

	setupTestEnv(tester, t)

	for i := 0; i < 256; i++ {
		initClusterCandidate(tester, t)
	}

	defer cleanup(tester, t)

	err := keyrotate.Rotate(tester.DB, tester.Key, &newKey)

	if err != nil {
		t.Fatalf("error rotating: %v\n", err)
	}

	// very all clusters decoded properly
	repo := gorm.NewClusterRepository(tester.DB, &newKey).(*gorm.ClusterRepository)

	ccs := []*models.ClusterCandidate{}

	if err := tester.DB.Find(&ccs).Error; err != nil {
		t.Fatalf("%v\n", err)
	}

	// decrypt with the old key
	for _, c := range ccs {
		cc, err := repo.ReadClusterCandidate(c.ProjectID, c.ID)

		if err != nil {
			t.Fatalf("error reading cluster: %v\n", err)
		}

		if string(cc.AWSClusterIDGuess) != "example-cluster-0" {
			t.Errorf("%s\n", string(cc.AWSClusterIDGuess))
		}

		if string(cc.Kubeconfig) != "current-context: testing\n" {
			t.Errorf("%s\n", string(cc.Kubeconfig))
		}
	}
}

func TestRegistryModelRotation(t *testing.T) {
	var newKey [32]byte

	for i, b := range []byte("__r3n3o3_s3r3n3_3n3r3p3i3n_k3y__") {
		newKey[i] = b
	}

	tester := &tester{
		dbFileName: "./porter_registry_rotate.db",
	}

	setupTestEnv(tester, t)

	for i := 0; i < 144; i++ {
		initRegistry(tester, t)
	}

	defer cleanup(tester, t)

	err := keyrotate.Rotate(tester.DB, tester.Key, &newKey)

	if err != nil {
		t.Fatalf("error rotating: %v\n", err)
	}

	// very all registries decoded properly
	repo := gorm.NewRegistryRepository(tester.DB, &newKey).(*gorm.RegistryRepository)

	regs := []*models.Registry{}

	if err := tester.DB.Preload("TokenCache").Find(&regs).Error; err != nil {
		t.Fatalf("%v\n", err)
	}

	// decrypt with the old key
	for _, r := range regs {
		registry, err := repo.ReadRegistry(r.ProjectID, r.ID)

		if err != nil {
			t.Fatalf("error reading registry: %v\n", err)
		}

		if string(registry.TokenCache.Token) != "token-1" {
			t.Errorf("%s\n", string(registry.TokenCache.Token))
		}
	}
}

func TestHelmRepoModelRotation(t *testing.T) {
	var newKey [32]byte

	for i, b := range []byte("__r3n3o3_s3r3n3_3n3r3p3i3n_k3y__") {
		newKey[i] = b
	}

	tester := &tester{
		dbFileName: "./porter_hr_rotate.db",
	}

	setupTestEnv(tester, t)

	for i := 0; i < 169; i++ {
		initHelmRepo(tester, t)
	}

	defer cleanup(tester, t)

	err := keyrotate.Rotate(tester.DB, tester.Key, &newKey)

	if err != nil {
		t.Fatalf("error rotating: %v\n", err)
	}

	// very all helm repos decoded properly
	repo := gorm.NewHelmRepoRepository(tester.DB, &newKey).(*gorm.HelmRepoRepository)

	hrs := []*models.HelmRepo{}

	if err := tester.DB.Preload("TokenCache").Find(&hrs).Error; err != nil {
		t.Fatalf("%v\n", err)
	}

	// decrypt with the old key
	for _, h := range hrs {
		hr, err := repo.ReadHelmRepo(h.ProjectID, h.ID)

		if err != nil {
			t.Fatalf("error reading helm repo: %v\n", err)
		}

		if string(hr.TokenCache.Token) != "token-1" {
			t.Errorf("%s\n", string(hr.TokenCache.Token))
		}
	}
}

func TestInfraModelRotation(t *testing.T) {
	var newKey [32]byte

	for i, b := range []byte("__r3n3o3_s3r3n3_3n3r3p3i3n_k3y__") {
		newKey[i] = b
	}

	tester := &tester{
		dbFileName: "./porter_infra_rotate.db",
	}

	setupTestEnv(tester, t)

	for i := 0; i < 128; i++ {
		initInfra(tester, t)
	}

	defer cleanup(tester, t)

	err := keyrotate.Rotate(tester.DB, tester.Key, &newKey)

	if err != nil {
		t.Fatalf("error rotating: %v\n", err)
	}

	// very all infras decoded properly
	repo := gorm.NewInfraRepository(tester.DB, &newKey).(*gorm.InfraRepository)

	infras := []*models.Infra{}

	if err := tester.DB.Find(&infras).Error; err != nil {
		t.Fatalf("%v\n", err)
	}

	// decrypt with the old key
	for _, i := range infras {
		infra, err := repo.ReadInfra(i.ProjectID, i.ID)

		if err != nil {
			t.Fatalf("error reading infra: %v\n", err)
		}

		if string(infra.LastApplied) != "testing" {
			t.Errorf("%s\n", string(infra.LastApplied))
		}
	}
}

func TestKubeIntegrationModelRotation(t *testing.T) {
	var newKey [32]byte

	for i, b := range []byte("__r3n3o3_s3r3n3_3n3r3p3i3n_k3y__") {
		newKey[i] = b
	}

	tester := &tester{
		dbFileName: "./porter_ki_rotate.db",
	}

	setupTestEnv(tester, t)

	for i := 0; i < 128; i++ {
		initKubeIntegration(tester, t)
	}

	defer cleanup(tester, t)

	err := keyrotate.Rotate(tester.DB, tester.Key, &newKey)

	if err != nil {
		t.Fatalf("error rotating: %v\n", err)
	}

	// very all kis decoded properly
	repo := gorm.NewKubeIntegrationRepository(tester.DB, &newKey).(*gorm.KubeIntegrationRepository)

	kis := []*ints.KubeIntegration{}

	if err := tester.DB.Find(&kis).Error; err != nil {
		t.Fatalf("%v\n", err)
	}

	// decrypt with the old key
	for _, k := range kis {
		ki, err := repo.ReadKubeIntegration(k.ProjectID, k.ID)

		if err != nil {
			t.Fatalf("error reading infra: %v\n", err)
		}

		if string(ki.Kubeconfig) != "current-context: testing\n" {
			t.Errorf("%s\n", string(ki.Kubeconfig))
		}

		if string(ki.ClientCertificateData) != "clientcertdata" {
			t.Errorf("%s\n", string(ki.ClientCertificateData))
		}

		if string(ki.ClientKeyData) != "clientkeydata" {
			t.Errorf("%s\n", string(ki.ClientKeyData))
		}

		if string(ki.Token) != "token" {
			t.Errorf("%s\n", string(ki.Token))
		}

		if string(ki.Username) != "username" {
			t.Errorf("%s\n", string(ki.Username))
		}

		if string(ki.Password) != "password" {
			t.Errorf("%s\n", string(ki.Password))
		}
	}
}

func TestBasicIntegrationModelRotation(t *testing.T) {
	var newKey [32]byte

	for i, b := range []byte("__r3n3o3_s3r3n3_3n3r3p3i3n_k3y__") {
		newKey[i] = b
	}

	tester := &tester{
		dbFileName: "./porter_basic_rotate.db",
	}

	setupTestEnv(tester, t)

	for i := 0; i < 128; i++ {
		initBasicIntegration(tester, t)
	}

	defer cleanup(tester, t)

	err := keyrotate.Rotate(tester.DB, tester.Key, &newKey)

	if err != nil {
		t.Fatalf("error rotating: %v\n", err)
	}

	// very all basics decoded properly
	repo := gorm.NewBasicIntegrationRepository(tester.DB, &newKey).(*gorm.BasicIntegrationRepository)

	basics := []*ints.BasicIntegration{}

	if err := tester.DB.Find(&basics).Error; err != nil {
		t.Fatalf("%v\n", err)
	}

	// decrypt with the old key
	for _, k := range basics {
		basic, err := repo.ReadBasicIntegration(k.ProjectID, k.ID)

		if err != nil {
			t.Fatalf("error reading infra: %v\n", err)
		}

		if string(basic.Username) != "username" {
			t.Errorf("%s\n", string(basic.Username))
		}

		if string(basic.Password) != "password" {
			t.Errorf("%s\n", string(basic.Password))
		}
	}
}

func TestOIDCIntegrationModelRotation(t *testing.T) {
	var newKey [32]byte

	for i, b := range []byte("__r3n3o3_s3r3n3_3n3r3p3i3n_k3y__") {
		newKey[i] = b
	}

	tester := &tester{
		dbFileName: "./porter_oidc_rotate.db",
	}

	setupTestEnv(tester, t)

	for i := 0; i < 128; i++ {
		initOIDCIntegration(tester, t)
	}

	defer cleanup(tester, t)

	err := keyrotate.Rotate(tester.DB, tester.Key, &newKey)

	if err != nil {
		t.Fatalf("error rotating: %v\n", err)
	}

	// very all oidcs decoded properly
	repo := gorm.NewOIDCIntegrationRepository(tester.DB, &newKey).(*gorm.OIDCIntegrationRepository)

	oidcs := []*ints.OIDCIntegration{}

	if err := tester.DB.Find(&oidcs).Error; err != nil {
		t.Fatalf("%v\n", err)
	}

	// decrypt with the old key
	for _, k := range oidcs {
		oidc, err := repo.ReadOIDCIntegration(k.ProjectID, k.ID)

		if err != nil {
			t.Fatalf("error reading infra: %v\n", err)
		}

		if string(oidc.IssuerURL) != "https://oidc.example.com" {
			t.Errorf("%s\n", string(oidc.IssuerURL))
		}

		if string(oidc.ClientID) != "exampleclientid" {
			t.Errorf("%s\n", string(oidc.ClientID))
		}

		if string(oidc.ClientSecret) != "exampleclientsecret" {
			t.Errorf("%s\n", string(oidc.ClientSecret))
		}

		if string(oidc.CertificateAuthorityData) != "cadata" {
			t.Errorf("%s\n", string(oidc.CertificateAuthorityData))
		}

		if string(oidc.IDToken) != "idtoken" {
			t.Errorf("%s\n", string(oidc.IDToken))
		}

		if string(oidc.RefreshToken) != "refreshtoken" {
			t.Errorf("%s\n", string(oidc.RefreshToken))
		}
	}
}

func TestOAuthIntegrationModelRotation(t *testing.T) {
	var newKey [32]byte

	for i, b := range []byte("__r3n3o3_s3r3n3_3n3r3p3i3n_k3y__") {
		newKey[i] = b
	}

	tester := &tester{
		dbFileName: "./porter_oauth_rotate.db",
	}

	setupTestEnv(tester, t)

	for i := 0; i < 128; i++ {
		initOAuthIntegration(tester, t)
	}

	defer cleanup(tester, t)

	err := keyrotate.Rotate(tester.DB, tester.Key, &newKey)

	if err != nil {
		t.Fatalf("error rotating: %v\n", err)
	}

	// very all oauths decoded properly
	repo := gorm.NewOAuthIntegrationRepository(tester.DB, &newKey, nil).(*gorm.OAuthIntegrationRepository)

	oauths := []*ints.OAuthIntegration{}

	if err := tester.DB.Find(&oauths).Error; err != nil {
		t.Fatalf("%v\n", err)
	}

	// decrypt with the old key
	for _, k := range oauths {
		oauth, err := repo.ReadOAuthIntegration(k.ProjectID, k.ID)

		if err != nil {
			t.Fatalf("error reading infra: %v\n", err)
		}

		if string(oauth.ClientID) != "exampleclientid" {
			t.Errorf("%s\n", string(oauth.ClientID))
		}

		if string(oauth.AccessToken) != "idtoken" {
			t.Errorf("%s\n", string(oauth.AccessToken))
		}

		if string(oauth.RefreshToken) != "refreshtoken" {
			t.Errorf("%s\n", string(oauth.RefreshToken))
		}
	}
}

func TestGCPIntegrationModelRotation(t *testing.T) {
	var newKey [32]byte

	for i, b := range []byte("__r3n3o3_s3r3n3_3n3r3p3i3n_k3y__") {
		newKey[i] = b
	}

	tester := &tester{
		dbFileName: "./porter_gcp_rotate.db",
	}

	setupTestEnv(tester, t)

	for i := 0; i < 128; i++ {
		initGCPIntegration(tester, t)
	}

	defer cleanup(tester, t)

	err := keyrotate.Rotate(tester.DB, tester.Key, &newKey)

	if err != nil {
		t.Fatalf("error rotating: %v\n", err)
	}

	// very all gcps decoded properly
	repo := gorm.NewGCPIntegrationRepository(tester.DB, &newKey, nil).(*gorm.GCPIntegrationRepository)

	gcps := []*ints.GCPIntegration{}

	if err := tester.DB.Find(&gcps).Error; err != nil {
		t.Fatalf("%v\n", err)
	}

	// decrypt with the old key
	for _, k := range gcps {
		gcp, err := repo.ReadGCPIntegration(k.ProjectID, k.ID)

		if err != nil {
			t.Fatalf("error reading infra: %v\n", err)
		}

		if string(gcp.GCPKeyData) != "{\"test\":\"key\"}" {
			t.Errorf("%s\n", string(gcp.GCPKeyData))
		}
	}
}

func TestAWSIntegrationModelRotation(t *testing.T) {
	var newKey [32]byte

	for i, b := range []byte("__r3n3o3_s3r3n3_3n3r3p3i3n_k3y__") {
		newKey[i] = b
	}

	tester := &tester{
		dbFileName: "./porter_aws_rotate.db",
	}

	setupTestEnv(tester, t)

	for i := 0; i < 128; i++ {
		initAWSIntegration(tester, t)
	}

	defer cleanup(tester, t)

	err := keyrotate.Rotate(tester.DB, tester.Key, &newKey)

	if err != nil {
		t.Fatalf("error rotating: %v\n", err)
	}

	// very all awss decoded properly
	repo := gorm.NewAWSIntegrationRepository(tester.DB, &newKey, nil).(*gorm.AWSIntegrationRepository)

	awss := []*ints.AWSIntegration{}

	if err := tester.DB.Find(&awss).Error; err != nil {
		t.Fatalf("%v\n", err)
	}

	// decrypt with the old key
	for _, k := range awss {
		aws, err := repo.ReadAWSIntegration(k.ProjectID, k.ID)

		if err != nil {
			t.Fatalf("error reading infra: %v\n", err)
		}

		if string(aws.AWSClusterID) != "example-cluster-0" {
			t.Errorf("%s\n", string(aws.AWSClusterID))
		}

		if string(aws.AWSAccessKeyID) != "accesskey" {
			t.Errorf("%s\n", string(aws.AWSAccessKeyID))
		}

		if string(aws.AWSSecretAccessKey) != "secret" {
			t.Errorf("%s\n", string(aws.AWSSecretAccessKey))
		}

		if string(aws.AWSSessionToken) != "optional" {
			t.Errorf("%s\n", string(aws.AWSSessionToken))
		}
	}
}
