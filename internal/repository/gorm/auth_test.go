package gorm_test

import (
	"testing"

	"github.com/go-test/deep"
	ints "github.com/porter-dev/porter/internal/models/integrations"
	orm "gorm.io/gorm"
)

func TestCreateKubeIntegration(t *testing.T) {
	tester := &tester{
		dbFileName: "./porter_create_ki.db",
	}

	setupTestEnv(tester, t)
	initUser(tester, t)
	initProject(tester, t)
	defer cleanup(tester, t)

	ki := &ints.KubeIntegration{
		Mechanism:  ints.KubeLocal,
		ProjectID:  tester.initProjects[0].ID,
		UserID:     tester.initUsers[0].ID,
		Kubeconfig: []byte("current-context: testing\n"),
	}

	expKI := *ki

	ki, err := tester.repo.KubeIntegration().CreateKubeIntegration(ki)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	ki, err = tester.repo.KubeIntegration().ReadKubeIntegration(tester.initProjects[0].ID, ki.Model.ID)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	// make sure id is 1
	if ki.Model.ID != 1 {
		t.Errorf("incorrect kube integration ID: expected %d, got %d\n", 1, ki.Model.ID)
	}

	// reset fields for deep.Equal
	ki.Model = orm.Model{}

	if diff := deep.Equal(expKI, *ki); diff != nil {
		t.Errorf("incorrect kube integration")
		t.Error(diff)
	}
}

func TestListKubeIntegrationsByProjectID(t *testing.T) {
	tester := &tester{
		dbFileName: "./porter_list_kis.db",
	}

	setupTestEnv(tester, t)
	initProject(tester, t)
	initKubeIntegration(tester, t)
	defer cleanup(tester, t)

	kis, err := tester.repo.KubeIntegration().ListKubeIntegrationsByProjectID(
		tester.initProjects[0].Model.ID,
	)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	if len(kis) != 1 {
		t.Fatalf("length of kube integrations incorrect: expected %d, got %d\n", 1, len(kis))
	}

	// make sure data is correct
	expKI := ints.KubeIntegration{
		Mechanism:  ints.KubeLocal,
		ProjectID:  tester.initProjects[0].ID,
		UserID:     tester.initUsers[0].ID,
		Kubeconfig: []byte("current-context: testing\n"),
	}

	ki := kis[0]

	// reset fields for reflect.DeepEqual
	ki.Model = orm.Model{}

	if diff := deep.Equal(expKI, *ki); diff != nil {
		t.Errorf("incorrect kube integration")
		t.Error(diff)
	}
}

func TestCreateBasicIntegration(t *testing.T) {
	tester := &tester{
		dbFileName: "./porter_create_basic.db",
	}

	setupTestEnv(tester, t)
	initUser(tester, t)
	initProject(tester, t)
	defer cleanup(tester, t)

	basic := &ints.BasicIntegration{
		ProjectID: tester.initProjects[0].ID,
		UserID:    tester.initUsers[0].ID,
		Username:  []byte("username"),
		Password:  []byte("password"),
	}

	expBasic := *basic

	basic, err := tester.repo.BasicIntegration().CreateBasicIntegration(basic)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	basic, err = tester.repo.BasicIntegration().ReadBasicIntegration(tester.initProjects[0].ID, basic.Model.ID)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	// make sure id is 1
	if basic.Model.ID != 1 {
		t.Errorf("incorrect basic integration ID: expected %d, got %d\n", 1, basic.Model.ID)
	}

	// reset fields for deep.Equal
	basic.Model = orm.Model{}

	if diff := deep.Equal(expBasic, *basic); diff != nil {
		t.Errorf("incorrect basic integration")
		t.Error(diff)
	}
}

func TestListBasicIntegrationsByProjectID(t *testing.T) {
	tester := &tester{
		dbFileName: "./porter_list_basics.db",
	}

	setupTestEnv(tester, t)
	initProject(tester, t)
	initBasicIntegration(tester, t)
	defer cleanup(tester, t)

	basics, err := tester.repo.BasicIntegration().ListBasicIntegrationsByProjectID(
		tester.initProjects[0].Model.ID,
	)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	if len(basics) != 1 {
		t.Fatalf("length of basic integrations incorrect: expected %d, got %d\n", 1, len(basics))
	}

	// make sure data is correct
	expBasic := ints.BasicIntegration{
		ProjectID: tester.initProjects[0].ID,
		UserID:    tester.initUsers[0].ID,
		Username:  []byte("username"),
		Password:  []byte("password"),
	}

	basic := basics[0]

	// reset fields for reflect.DeepEqual
	basic.Model = orm.Model{}

	if diff := deep.Equal(expBasic, *basic); diff != nil {
		t.Errorf("incorrect basic integration")
		t.Error(diff)
	}
}

func TestCreateOIDCIntegration(t *testing.T) {
	tester := &tester{
		dbFileName: "./porter_create_oidc.db",
	}

	setupTestEnv(tester, t)
	initUser(tester, t)
	initProject(tester, t)
	defer cleanup(tester, t)

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

	expOIDC := *oidc

	oidc, err := tester.repo.OIDCIntegration().CreateOIDCIntegration(oidc)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	oidc, err = tester.repo.OIDCIntegration().ReadOIDCIntegration(tester.initProjects[0].ID, oidc.Model.ID)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	// make sure id is 1
	if oidc.Model.ID != 1 {
		t.Errorf("incorrect oidc integration ID: expected %d, got %d\n", 1, oidc.Model.ID)
	}

	// reset fields for deep.Equal
	oidc.Model = orm.Model{}

	if diff := deep.Equal(expOIDC, *oidc); diff != nil {
		t.Errorf("incorrect oidc integration")
		t.Error(diff)
	}
}

func TestListOIDCIntegrationsByProjectID(t *testing.T) {
	tester := &tester{
		dbFileName: "./porter_list_oidcs.db",
	}

	setupTestEnv(tester, t)
	initProject(tester, t)
	initOIDCIntegration(tester, t)
	defer cleanup(tester, t)

	oidcs, err := tester.repo.OIDCIntegration().ListOIDCIntegrationsByProjectID(
		tester.initProjects[0].Model.ID,
	)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	if len(oidcs) != 1 {
		t.Fatalf("length of oidc integrations incorrect: expected %d, got %d\n", 1, len(oidcs))
	}

	// make sure data is correct
	expOIDC := ints.OIDCIntegration{
		Client:       ints.OIDCKube,
		ProjectID:    tester.initProjects[0].ID,
		UserID:       tester.initUsers[0].ID,
		IssuerURL:    []byte("https://oidc.example.com"),
		ClientID:     []byte("exampleclientid"),
		ClientSecret: []byte("exampleclientsecret"),
		IDToken:      []byte("idtoken"),
		RefreshToken: []byte("refreshtoken"),
	}

	oidc := oidcs[0]

	// reset fields for reflect.DeepEqual
	oidc.Model = orm.Model{}

	if diff := deep.Equal(expOIDC, *oidc); diff != nil {
		t.Errorf("incorrect oidc integration")
		t.Error(diff)
	}
}

func TestCreateOAuthIntegration(t *testing.T) {
	tester := &tester{
		dbFileName: "./porter_create_oauth.db",
	}

	setupTestEnv(tester, t)
	initUser(tester, t)
	initProject(tester, t)
	defer cleanup(tester, t)

	oauth := &ints.OAuthIntegration{
		SharedOAuthModel: ints.SharedOAuthModel{
			ClientID:     []byte("exampleclientid"),
			AccessToken:  []byte("idtoken"),
			RefreshToken: []byte("refreshtoken"),
		},
		Client:    ints.OAuthGithub,
		ProjectID: tester.initProjects[0].ID,
		UserID:    tester.initUsers[0].ID,
	}

	expOAuth := *oauth

	oauth, err := tester.repo.OAuthIntegration().CreateOAuthIntegration(oauth)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	oauth, err = tester.repo.OAuthIntegration().ReadOAuthIntegration(tester.initProjects[0].ID, oauth.Model.ID)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	// make sure id is 1
	if oauth.Model.ID != 1 {
		t.Errorf("incorrect oauth integration ID: expected %d, got %d\n", 1, oauth.Model.ID)
	}

	// reset fields for deep.Equal
	oauth.Model = orm.Model{}

	if diff := deep.Equal(expOAuth, *oauth); diff != nil {
		t.Errorf("incorrect oauth integration")
		t.Error(diff)
	}
}

func TestListOAuthIntegrationsByProjectID(t *testing.T) {
	tester := &tester{
		dbFileName: "./porter_list_oauths.db",
	}

	setupTestEnv(tester, t)
	initProject(tester, t)
	initOAuthIntegration(tester, t)
	defer cleanup(tester, t)

	oauths, err := tester.repo.OAuthIntegration().ListOAuthIntegrationsByProjectID(
		tester.initProjects[0].Model.ID,
	)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	if len(oauths) != 1 {
		t.Fatalf("length of oauth integrations incorrect: expected %d, got %d\n", 1, len(oauths))
	}

	// make sure data is correct
	expOAuth := ints.OAuthIntegration{
		SharedOAuthModel: ints.SharedOAuthModel{
			ClientID:     []byte("exampleclientid"),
			AccessToken:  []byte("idtoken"),
			RefreshToken: []byte("refreshtoken"),
		},
		Client:    ints.OAuthGithub,
		ProjectID: tester.initProjects[0].ID,
		UserID:    tester.initUsers[0].ID,
	}

	oauth := oauths[0]

	// reset fields for reflect.DeepEqual
	oauth.Model = orm.Model{}

	if diff := deep.Equal(expOAuth, *oauth); diff != nil {
		t.Errorf("incorrect oauth integration")
		t.Error(diff)
	}
}

func TestCreateGCPIntegration(t *testing.T) {
	tester := &tester{
		dbFileName: "./porter_create_gcp.db",
	}

	setupTestEnv(tester, t)
	initUser(tester, t)
	initProject(tester, t)
	defer cleanup(tester, t)

	gcp := &ints.GCPIntegration{
		ProjectID:    tester.initProjects[0].ID,
		UserID:       tester.initUsers[0].ID,
		GCPProjectID: "test-proj-123456",
		GCPUserEmail: "test@test.it",
		GCPKeyData:   []byte("{\"test\":\"key\"}"),
	}

	expGCP := *gcp

	gcp, err := tester.repo.GCPIntegration().CreateGCPIntegration(gcp)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	gcp, err = tester.repo.GCPIntegration().ReadGCPIntegration(tester.initProjects[0].ID, gcp.Model.ID)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	// make sure id is 1
	if gcp.Model.ID != 1 {
		t.Errorf("incorrect gcp integration ID: expected %d, got %d\n", 1, gcp.Model.ID)
	}

	// reset fields for deep.Equal
	gcp.Model = orm.Model{}

	if diff := deep.Equal(expGCP, *gcp); diff != nil {
		t.Errorf("incorrect gcp integration")
		t.Error(diff)
	}
}

func TestListGCPIntegrationsByProjectID(t *testing.T) {
	tester := &tester{
		dbFileName: "./porter_list_gcps.db",
	}

	setupTestEnv(tester, t)
	initProject(tester, t)
	initGCPIntegration(tester, t)
	defer cleanup(tester, t)

	gcps, err := tester.repo.GCPIntegration().ListGCPIntegrationsByProjectID(
		tester.initProjects[0].Model.ID,
	)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	if len(gcps) != 1 {
		t.Fatalf("length of gcp integrations incorrect: expected %d, got %d\n", 1, len(gcps))
	}

	// make sure data is correct
	expGCP := ints.GCPIntegration{
		ProjectID:    tester.initProjects[0].ID,
		UserID:       tester.initUsers[0].ID,
		GCPProjectID: "test-proj-123456",
		GCPUserEmail: "test@test.it",
		GCPKeyData:   []byte("{\"test\":\"key\"}"),
	}

	gcp := gcps[0]

	// reset fields for reflect.DeepEqual
	gcp.Model = orm.Model{}

	if diff := deep.Equal(expGCP, *gcp); diff != nil {
		t.Errorf("incorrect gcp integration")
		t.Error(diff)
	}
}

func TestCreateAWSIntegration(t *testing.T) {
	tester := &tester{
		dbFileName: "./porter_create_aws.db",
	}

	setupTestEnv(tester, t)
	initUser(tester, t)
	initProject(tester, t)
	defer cleanup(tester, t)

	aws := &ints.AWSIntegration{
		ProjectID:          tester.initProjects[0].ID,
		UserID:             tester.initUsers[0].ID,
		AWSClusterID:       []byte("example-cluster-0"),
		AWSAccessKeyID:     []byte("accesskey"),
		AWSSecretAccessKey: []byte("secret"),
		AWSSessionToken:    []byte("optional"),
	}

	expAWS := *aws

	aws, err := tester.repo.AWSIntegration().CreateAWSIntegration(aws)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	aws, err = tester.repo.AWSIntegration().ReadAWSIntegration(tester.initProjects[0].ID, aws.Model.ID)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	// make sure id is 1
	if aws.Model.ID != 1 {
		t.Errorf("incorrect aws integration ID: expected %d, got %d\n", 1, aws.Model.ID)
	}

	// reset fields for deep.Equal
	aws.Model = orm.Model{}

	if diff := deep.Equal(expAWS, *aws); diff != nil {
		t.Errorf("incorrect aws integration")
		t.Error(diff)
	}
}

func TestOverwriteAWSIntegration(t *testing.T) {
	tester := &tester{
		dbFileName: "./porter_overwrite_aws.db",
	}

	setupTestEnv(tester, t)
	initUser(tester, t)
	initProject(tester, t)
	initAWSIntegration(tester, t)
	defer cleanup(tester, t)

	aws, err := tester.repo.AWSIntegration().ReadAWSIntegration(tester.initProjects[0].ID, 1)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	aws.AWSAccessKeyID = []byte("accesskey2")
	aws.AWSSecretAccessKey = []byte("secret2")

	aws, err = tester.repo.AWSIntegration().OverwriteAWSIntegration(aws)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	gotAWS, err := tester.repo.AWSIntegration().ReadAWSIntegration(tester.initProjects[0].ID, 1)

	expAWS := &ints.AWSIntegration{
		ProjectID:          tester.initProjects[0].ID,
		UserID:             tester.initUsers[0].ID,
		AWSClusterID:       []byte("example-cluster-0"),
		AWSAccessKeyID:     []byte("accesskey2"),
		AWSSecretAccessKey: []byte("secret2"),
		AWSSessionToken:    []byte("optional"),
	}

	// make sure id is 1
	if gotAWS.Model.ID != 1 {
		t.Errorf("incorrect aws integration ID: expected %d, got %d\n", 1, gotAWS.Model.ID)
	}

	// reset fields for deep.Equal
	gotAWS.Model = orm.Model{}

	if diff := deep.Equal(expAWS, gotAWS); diff != nil {
		t.Errorf("incorrect aws integration")
		t.Error(diff)
	}
}

func TestListAWSIntegrationsByProjectID(t *testing.T) {
	tester := &tester{
		dbFileName: "./porter_list_awss.db",
	}

	setupTestEnv(tester, t)
	initProject(tester, t)
	initAWSIntegration(tester, t)
	defer cleanup(tester, t)

	awss, err := tester.repo.AWSIntegration().ListAWSIntegrationsByProjectID(
		tester.initProjects[0].Model.ID,
	)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	if len(awss) != 1 {
		t.Fatalf("length of aws integrations incorrect: expected %d, got %d\n", 1, len(awss))
	}

	// make sure data is correct
	expAWS := ints.AWSIntegration{
		ProjectID:          tester.initProjects[0].ID,
		UserID:             tester.initUsers[0].ID,
		AWSClusterID:       []byte("example-cluster-0"),
		AWSAccessKeyID:     []byte("accesskey"),
		AWSSecretAccessKey: []byte("secret"),
		AWSSessionToken:    []byte("optional"),
	}

	aws := awss[0]

	// reset fields for reflect.DeepEqual
	aws.Model = orm.Model{}

	if diff := deep.Equal(expAWS, *aws); diff != nil {
		t.Errorf("incorrect aws integration")
		t.Error(diff)
	}
}
