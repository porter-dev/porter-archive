package forms_test

import (
	"encoding/base64"
	"testing"

	"github.com/porter-dev/porter/internal/forms"
	"github.com/porter-dev/porter/internal/kubernetes"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository/test"
)

func TestPopulateServiceAccountBasic(t *testing.T) {
	// create the in-memory repository
	repo := test.NewRepository(true)

	// create a new project
	repo.Project.CreateProject(&models.Project{
		Name: "test-project",
	})

	// create a ServiceAccountCandidate from a kubeconfig
	saCandidates, err := kubernetes.GetServiceAccountCandidates([]byte(ClusterCAWithData), false)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	for _, saCandidate := range saCandidates {
		repo.ServiceAccount.CreateServiceAccountCandidate(saCandidate)
	}

	// create a new form
	form := forms.ServiceAccountActionResolver{
		ServiceAccountCandidateID: 1,
	}

	err = form.PopulateServiceAccount(repo.ServiceAccount)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	sa, err := repo.ServiceAccount.CreateServiceAccount(form.SA)
	decodedStr, _ := base64.StdEncoding.DecodeString("LS0tLS1CRUdJTiBDRVJ=")

	if len(sa.Clusters) != 1 {
		t.Fatalf("cluster not written\n")
	}

	if sa.Clusters[0].ServiceAccountID != 1 {
		t.Errorf("service account ID of joined cluster is not 1")
	}

	if string(sa.Clusters[0].CertificateAuthorityData) != string(decodedStr) {
		t.Errorf("cluster ca data and input do not match: expected %s, got %s\n",
			string(sa.Clusters[0].CertificateAuthorityData), string(decodedStr))
	}

	if sa.Integration != "x509" {
		t.Errorf("service account auth mechanism is not x509")
	}

	if string(sa.ClientCertificateData) != string(decodedStr) {
		t.Errorf("service account cert data and input do not match: expected %s, got %s\n",
			string(sa.ClientCertificateData), string(decodedStr))
	}

	if string(sa.ClientKeyData) != string(decodedStr) {
		t.Errorf("service account key data and input do not match: expected %s, got %s\n",
			string(sa.ClientKeyData), string(decodedStr))
	}
}

func TestPopulateServiceAccountClusterDataAction(t *testing.T) {
	// create the in-memory repository
	repo := test.NewRepository(true)

	// create a new project
	repo.Project.CreateProject(&models.Project{
		Name: "test-project",
	})

	// create a ServiceAccountCandidate from a kubeconfig
	saCandidates, err := kubernetes.GetServiceAccountCandidates([]byte(ClusterCAWithoutData), false)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	for _, saCandidate := range saCandidates {
		repo.ServiceAccount.CreateServiceAccountCandidate(saCandidate)
	}

	// create a new form
	form := forms.ClusterCADataAction{
		ServiceAccountActionResolver: &forms.ServiceAccountActionResolver{
			ServiceAccountCandidateID: 1,
		},
		ClusterCAData: "LS0tLS1CRUdJTiBDRVJ=",
	}

	err = form.PopulateServiceAccount(repo.ServiceAccount)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	sa, err := repo.ServiceAccount.CreateServiceAccount(form.ServiceAccountActionResolver.SA)
	decodedStr, _ := base64.StdEncoding.DecodeString("LS0tLS1CRUdJTiBDRVJ=")

	if len(sa.Clusters) != 1 {
		t.Fatalf("cluster not written\n")
	}

	if sa.Clusters[0].ServiceAccountID != 1 {
		t.Errorf("service account ID of joined cluster is not 1")
	}

	if string(sa.Clusters[0].CertificateAuthorityData) != string(decodedStr) {
		t.Errorf("cluster ca data and input do not match: expected %s, got %s\n",
			string(sa.Clusters[0].CertificateAuthorityData), string(decodedStr))
	}

	if sa.Integration != "x509" {
		t.Errorf("service account auth mechanism is not x509")
	}

	if string(sa.ClientCertificateData) != string(decodedStr) {
		t.Errorf("service account cert data and input do not match: expected %s, got %s\n",
			string(sa.ClientCertificateData), string(decodedStr))
	}

	if string(sa.ClientKeyData) != string(decodedStr) {
		t.Errorf("service account key data and input do not match: expected %s, got %s\n",
			string(sa.ClientKeyData), string(decodedStr))
	}
}

func TestPopulateServiceAccountClusterLocalhostAction(t *testing.T) {
	// create the in-memory repository
	repo := test.NewRepository(true)

	// create a new project
	repo.Project.CreateProject(&models.Project{
		Name: "test-project",
	})

	// create a ServiceAccountCandidate from a kubeconfig
	saCandidates, err := kubernetes.GetServiceAccountCandidates([]byte(ClusterLocalhost), false)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	for _, saCandidate := range saCandidates {
		repo.ServiceAccount.CreateServiceAccountCandidate(saCandidate)
	}

	// create a new form
	form := forms.ClusterLocalhostAction{
		ServiceAccountActionResolver: &forms.ServiceAccountActionResolver{
			ServiceAccountCandidateID: 1,
		},
		ClusterHostname: "host.docker.internal",
	}

	err = form.PopulateServiceAccount(repo.ServiceAccount)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	sa, err := repo.ServiceAccount.CreateServiceAccount(form.ServiceAccountActionResolver.SA)
	decodedStr, _ := base64.StdEncoding.DecodeString("LS0tLS1CRUdJTiBDRVJ=")

	if len(sa.Clusters) != 1 {
		t.Fatalf("cluster not written\n")
	}

	if sa.Clusters[0].ServiceAccountID != 1 {
		t.Errorf("service account ID of joined cluster is not 1")
	}

	if sa.Clusters[0].Server != "https://host.docker.internal:30000" {
		t.Errorf("service account cluster server is incorrect: expected %s, got %s\n",
			"https://host.docker.internal:30000", sa.Clusters[0].Server)
	}

	if sa.Integration != "x509" {
		t.Errorf("service account auth mechanism is not x509")
	}

	if string(sa.ClientCertificateData) != string(decodedStr) {
		t.Errorf("service account cert data and input do not match: expected %s, got %s\n",
			string(sa.ClientCertificateData), string(decodedStr))
	}

	if string(sa.ClientKeyData) != string(decodedStr) {
		t.Errorf("service account key data and input do not match: expected %s, got %s\n",
			string(sa.ClientKeyData), string(decodedStr))
	}
}

func TestPopulateServiceAccountClientCertAction(t *testing.T) {
	// create the in-memory repository
	repo := test.NewRepository(true)

	// create a new project
	repo.Project.CreateProject(&models.Project{
		Name: "test-project",
	})

	// create a ServiceAccountCandidate from a kubeconfig
	saCandidates, err := kubernetes.GetServiceAccountCandidates([]byte(ClientWithoutCertData), false)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	for _, saCandidate := range saCandidates {
		repo.ServiceAccount.CreateServiceAccountCandidate(saCandidate)
	}

	// create a new form
	form := forms.ClientCertDataAction{
		ServiceAccountActionResolver: &forms.ServiceAccountActionResolver{
			ServiceAccountCandidateID: 1,
		},
		ClientCertData: "LS0tLS1CRUdJTiBDRVJ=",
	}

	err = form.PopulateServiceAccount(repo.ServiceAccount)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	sa, err := repo.ServiceAccount.CreateServiceAccount(form.ServiceAccountActionResolver.SA)
	decodedStr, _ := base64.StdEncoding.DecodeString("LS0tLS1CRUdJTiBDRVJ=")

	if len(sa.Clusters) != 1 {
		t.Fatalf("cluster not written\n")
	}

	if sa.Clusters[0].ServiceAccountID != 1 {
		t.Errorf("service account ID of joined cluster is not 1")
	}

	if string(sa.Clusters[0].CertificateAuthorityData) != string(decodedStr) {
		t.Errorf("cluster ca data and input do not match: expected %s, got %s\n",
			string(sa.Clusters[0].CertificateAuthorityData), string(decodedStr))
	}

	if sa.Integration != "x509" {
		t.Errorf("service account auth mechanism is not x509")
	}

	if string(sa.ClientCertificateData) != string(decodedStr) {
		t.Errorf("service account cert data and input do not match: expected %s, got %s\n",
			string(sa.ClientCertificateData), string(decodedStr))
	}

	if string(sa.ClientKeyData) != string(decodedStr) {
		t.Errorf("service account key data and input do not match: expected %s, got %s\n",
			string(sa.ClientKeyData), string(decodedStr))
	}
}

func TestPopulateServiceAccountClientCertAndKeyActions(t *testing.T) {
	// create the in-memory repository
	repo := test.NewRepository(true)

	// create a new project
	repo.Project.CreateProject(&models.Project{
		Name: "test-project",
	})

	// create a ServiceAccountCandidate from a kubeconfig
	saCandidates, err := kubernetes.GetServiceAccountCandidates([]byte(ClientWithoutCertAndKeyData), false)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	for _, saCandidate := range saCandidates {
		repo.ServiceAccount.CreateServiceAccountCandidate(saCandidate)
	}

	// create a new form
	form := forms.ClientCertDataAction{
		ServiceAccountActionResolver: &forms.ServiceAccountActionResolver{
			ServiceAccountCandidateID: 1,
		},
		ClientCertData: "LS0tLS1CRUdJTiBDRVJ=",
	}

	err = form.PopulateServiceAccount(repo.ServiceAccount)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	keyForm := forms.ClientKeyDataAction{
		ServiceAccountActionResolver: form.ServiceAccountActionResolver,
		ClientKeyData:                "LS0tLS1CRUdJTiBDRVJ=",
	}

	err = keyForm.PopulateServiceAccount(repo.ServiceAccount)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	sa, err := repo.ServiceAccount.CreateServiceAccount(keyForm.ServiceAccountActionResolver.SA)
	decodedStr, _ := base64.StdEncoding.DecodeString("LS0tLS1CRUdJTiBDRVJ=")

	if len(sa.Clusters) != 1 {
		t.Fatalf("cluster not written\n")
	}

	if sa.Clusters[0].ServiceAccountID != 1 {
		t.Errorf("service account ID of joined cluster is not 1")
	}

	if string(sa.Clusters[0].CertificateAuthorityData) != string(decodedStr) {
		t.Errorf("cluster ca data and input do not match: expected %s, got %s\n",
			string(sa.Clusters[0].CertificateAuthorityData), string(decodedStr))
	}

	if sa.Integration != "x509" {
		t.Errorf("service account auth mechanism is not x509")
	}

	if string(sa.ClientCertificateData) != string(decodedStr) {
		t.Errorf("service account cert data and input do not match: expected %s, got %s\n",
			string(sa.ClientCertificateData), string(decodedStr))
	}

	if string(sa.ClientKeyData) != string(decodedStr) {
		t.Errorf("service account cert data and input do not match: expected %s, got %s\n",
			string(sa.ClientKeyData), string(decodedStr))
	}
}

func TestPopulateServiceAccountTokenDataAction(t *testing.T) {
	// create the in-memory repository
	repo := test.NewRepository(true)
	tokenData := "abcdefghijklmnop"

	// create a new project
	repo.Project.CreateProject(&models.Project{
		Name: "test-project",
	})

	// create a ServiceAccountCandidate from a kubeconfig
	saCandidates, err := kubernetes.GetServiceAccountCandidates([]byte(BearerTokenWithoutData), false)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	for _, saCandidate := range saCandidates {
		repo.ServiceAccount.CreateServiceAccountCandidate(saCandidate)
	}

	// create a new form
	form := forms.TokenDataAction{
		ServiceAccountActionResolver: &forms.ServiceAccountActionResolver{
			ServiceAccountCandidateID: 1,
		},
		TokenData: tokenData,
	}

	err = form.PopulateServiceAccount(repo.ServiceAccount)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	sa, err := repo.ServiceAccount.CreateServiceAccount(form.ServiceAccountActionResolver.SA)

	if len(sa.Clusters) != 1 {
		t.Fatalf("cluster not written\n")
	}

	if sa.Clusters[0].ServiceAccountID != 1 {
		t.Errorf("service account ID of joined cluster is not 1")
	}

	if sa.Integration != models.Bearer {
		t.Errorf("service account auth mechanism is not %s\n", models.Bearer)
	}

	if string(sa.Token) != tokenData {
		t.Errorf("service account token data is wrong: expected %s, got %s\n",
			tokenData, sa.Token)
	}
}

func TestPopulateServiceAccountGCPKeyDataAction(t *testing.T) {
	// create the in-memory repository
	repo := test.NewRepository(true)
	gcpKeyData := []byte(`{"key": "data"}`)

	// create a new project
	repo.Project.CreateProject(&models.Project{
		Name: "test-project",
	})

	// create a ServiceAccountCandidate from a kubeconfig
	saCandidates, err := kubernetes.GetServiceAccountCandidates([]byte(GCPPlugin), false)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	for _, saCandidate := range saCandidates {
		repo.ServiceAccount.CreateServiceAccountCandidate(saCandidate)
	}

	// create a new form
	form := forms.GCPKeyDataAction{
		ServiceAccountActionResolver: &forms.ServiceAccountActionResolver{
			ServiceAccountCandidateID: 1,
		},
		GCPKeyData: string(gcpKeyData),
	}

	err = form.PopulateServiceAccount(repo.ServiceAccount)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	sa, err := repo.ServiceAccount.CreateServiceAccount(form.ServiceAccountActionResolver.SA)

	if len(sa.Clusters) != 1 {
		t.Fatalf("cluster not written\n")
	}

	if sa.Clusters[0].ServiceAccountID != 1 {
		t.Errorf("service account ID of joined cluster is not 1")
	}

	if sa.Integration != models.GCP {
		t.Errorf("service account auth mechanism is not %s\n", models.GCP)
	}

	if string(sa.GCPKeyData) != string(gcpKeyData) {
		t.Errorf("service account token data is wrong: expected %s, got %s\n",
			string(sa.GCPKeyData), string(gcpKeyData))
	}
}

func TestPopulateServiceAccountAWSKeyDataAction(t *testing.T) {
	// create the in-memory repository
	repo := test.NewRepository(true)

	// create a new project
	repo.Project.CreateProject(&models.Project{
		Name: "test-project",
	})

	// create a ServiceAccountCandidate from a kubeconfig
	saCandidates, err := kubernetes.GetServiceAccountCandidates([]byte(AWSEKSGetTokenExec), false)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	for _, saCandidate := range saCandidates {
		repo.ServiceAccount.CreateServiceAccountCandidate(saCandidate)
	}

	// create a new form
	form := forms.AWSDataAction{
		ServiceAccountActionResolver: &forms.ServiceAccountActionResolver{
			ServiceAccountCandidateID: 1,
		},
		AWSAccessKeyID:     "ALSDKJFADSF",
		AWSSecretAccessKey: "ASDLFKJALSDKFJ",
		AWSClusterID:       "cluster-test",
	}

	err = form.PopulateServiceAccount(repo.ServiceAccount)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	sa, err := repo.ServiceAccount.CreateServiceAccount(form.ServiceAccountActionResolver.SA)

	if len(sa.Clusters) != 1 {
		t.Fatalf("cluster not written\n")
	}

	if sa.Clusters[0].ServiceAccountID != 1 {
		t.Errorf("service account ID of joined cluster is not 1")
	}

	if sa.Integration != models.AWS {
		t.Errorf("service account auth mechanism is not %s\n", models.AWS)
	}

	if string(sa.AWSAccessKeyID) != "ALSDKJFADSF" {
		t.Errorf("service account aws access key id is wrong: expected %s, got %s\n",
			"ALSDKJFADSF", sa.AWSAccessKeyID)
	}

	if string(sa.AWSSecretAccessKey) != "ASDLFKJALSDKFJ" {
		t.Errorf("service account aws access secret key is wrong: expected %s, got %s\n",
			"ASDLFKJALSDKFJ", sa.AWSSecretAccessKey)
	}

	if string(sa.AWSClusterID) != "cluster-test" {
		t.Errorf("service account aws cluster id is wrong: expected %s, got %s\n",
			"cluster-test", sa.AWSClusterID)
	}
}

func TestPopulateServiceAccountOIDCAction(t *testing.T) {
	// create the in-memory repository
	repo := test.NewRepository(true)

	// create a new project
	repo.Project.CreateProject(&models.Project{
		Name: "test-project",
	})

	// create a ServiceAccountCandidate from a kubeconfig
	saCandidates, err := kubernetes.GetServiceAccountCandidates([]byte(OIDCAuthWithoutData), false)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	for _, saCandidate := range saCandidates {
		repo.ServiceAccount.CreateServiceAccountCandidate(saCandidate)
	}

	// create a new form
	form := forms.OIDCIssuerDataAction{
		ServiceAccountActionResolver: &forms.ServiceAccountActionResolver{
			ServiceAccountCandidateID: 1,
		},
		OIDCIssuerCAData: "LS0tLS1CRUdJTiBDRVJ=",
	}

	err = form.PopulateServiceAccount(repo.ServiceAccount)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	sa, err := repo.ServiceAccount.CreateServiceAccount(form.ServiceAccountActionResolver.SA)

	if len(sa.Clusters) != 1 {
		t.Fatalf("cluster not written\n")
	}

	if sa.Clusters[0].ServiceAccountID != 1 {
		t.Errorf("service account ID of joined cluster is not 1")
	}

	if sa.Integration != models.OIDC {
		t.Errorf("service account auth mechanism is not %s\n", models.OIDC)
	}

	if string(sa.OIDCCertificateAuthorityData) != "LS0tLS1CRUdJTiBDRVJ=" {
		t.Errorf("service account key data and input do not match: expected %s, got %s\n",
			string(sa.OIDCCertificateAuthorityData), "LS0tLS1CRUdJTiBDRVJ=")
	}
}

const ClusterCAWithData string = `
apiVersion: v1
kind: Config
clusters:
- name: cluster-test
  cluster:
    server: https://localhost
    certificate-authority-data: LS0tLS1CRUdJTiBDRVJ=
contexts:
- context:
    cluster: cluster-test
    user: test-admin
  name: context-test
users:
- name: test-admin
  user:
    client-certificate-data: LS0tLS1CRUdJTiBDRVJ=
    client-key-data: LS0tLS1CRUdJTiBDRVJ=
current-context: context-test
`

const ClusterCAWithoutData string = `
apiVersion: v1
kind: Config
clusters:
- name: cluster-test
  cluster:
    server: https://localhost
    certificate-authority: /fake/path/to/ca.pem
contexts:
- context:
    cluster: cluster-test
    user: test-admin
  name: context-test
users:
- name: test-admin
  user:
    client-certificate-data: LS0tLS1CRUdJTiBDRVJ=
    client-key-data: LS0tLS1CRUdJTiBDRVJ=
current-context: context-test
`

const ClusterLocalhost string = `
apiVersion: v1
kind: Config
clusters:
- name: cluster-test
  cluster:
    server: https://localhost:30000
contexts:
- context:
    cluster: cluster-test
    user: test-admin
  name: context-test
users:
- name: test-admin
  user:
    client-certificate-data: LS0tLS1CRUdJTiBDRVJ=
    client-key-data: LS0tLS1CRUdJTiBDRVJ=
current-context: context-test
`

const ClientWithoutCertData string = `
apiVersion: v1
kind: Config
clusters:
- name: cluster-test
  cluster:
    server: https://localhost
    certificate-authority-data: LS0tLS1CRUdJTiBDRVJ=
contexts:
- context:
    cluster: cluster-test
    user: test-admin
  name: context-test
users:
- name: test-admin
  user:
    client-certificate: /fake/path/to/ca.pem
    client-key-data: LS0tLS1CRUdJTiBDRVJ=
current-context: context-test
`

const ClientWithoutCertAndKeyData string = `
apiVersion: v1
kind: Config
clusters:
- name: cluster-test
  cluster:
    server: https://localhost
    certificate-authority-data: LS0tLS1CRUdJTiBDRVJ=
contexts:
- context:
    cluster: cluster-test
    user: test-admin
  name: context-test
users:
- name: test-admin
  user:
    client-certificate: /fake/path/to/ca.pem
    client-key: /fake/path/to/ca.pem
current-context: context-test
`

const BearerTokenWithoutData string = `
apiVersion: v1
kind: Config
preferences: {}
current-context: context-test
clusters:
- cluster:
    server: https://localhost
  name: cluster-test
contexts:
- context:
    cluster: cluster-test
    user: test-admin
  name: context-test
users:
- name: test-admin
  user:
    tokenFile: /path/to/token/file.txt
`
const GCPPlugin string = `
apiVersion: v1
kind: Config
clusters:
- name: cluster-test
  cluster:
    server: https://localhost
    certificate-authority-data: LS0tLS1CRUdJTiBDRVJ=
users:
- name: test-admin
  user:
    auth-provider:
      name: gcp
contexts:
- context:
    cluster: cluster-test
    user: test-admin
  name: context-test
current-context: context-test
`

const AWSEKSGetTokenExec string = `
apiVersion: v1
clusters:
- cluster:
    server: https://localhost
    certificate-authority-data: LS0tLS1CRUdJTiBDRVJ=
  name: cluster-test
contexts:
- context:
    cluster: cluster-test
    user: test-admin
  name: context-test
current-context: context-test
kind: Config
preferences: {}
users:
- name: test-admin
  user:
    exec:
      apiVersion: client.authentication.k8s.io/v1alpha1
      command: aws
      args:
        - "eks"
        - "get-token"
        - "--cluster-name"
        - "cluster-test"
`

const OIDCAuthWithoutData string = `
apiVersion: v1
clusters:
- cluster:
    server: https://localhost
    certificate-authority-data: LS0tLS1CRUdJTiBDRVJ=
  name: cluster-test
contexts:
- context:
    cluster: cluster-test
    user: test-admin
  name: context-test
current-context: context-test
kind: Config
preferences: {}
users:
- name: test-admin
  user:
    auth-provider:
      config:
        client-id: porter-api
        id-token: token
        idp-issuer-url: https://localhost
        idp-certificate-authority: /fake/path/to/ca.pem
      name: oidc
`
