package api_test

import (
	"encoding/json"
	"net/http"
	"reflect"
	"strings"
	"testing"

	"github.com/go-test/deep"
	"github.com/porter-dev/porter/internal/forms"
	"github.com/porter-dev/porter/internal/models"
)

// ------------------------- TEST TYPES AND MAIN LOOP ------------------------- //

type projTest struct {
	initializers []func(t *tester)
	msg          string
	method       string
	endpoint     string
	body         string
	expStatus    int
	expBody      string
	useCookie    bool
	validators   []func(c *projTest, tester *tester, t *testing.T)
}

func testProjRequests(t *testing.T, tests []*projTest, canQuery bool) {
	for _, c := range tests {
		// create a new tester
		tester := newTester(canQuery)

		// if there's an initializer, call it
		for _, init := range c.initializers {
			init(tester)
		}

		req, err := http.NewRequest(
			c.method,
			c.endpoint,
			strings.NewReader(c.body),
		)

		tester.req = req

		if c.useCookie {
			req.AddCookie(tester.cookie)
		}

		if err != nil {
			t.Fatal(err)
		}

		tester.execute()
		rr := tester.rr

		// first, check that the status matches
		if status := rr.Code; status != c.expStatus {
			t.Errorf("%s, handler returned wrong status code: got %v want %v",
				c.msg, status, c.expStatus)
		}

		// if there's a validator, call it
		for _, validate := range c.validators {
			validate(c, tester, t)
		}
	}
}

// ------------------------- TEST FIXTURES AND FUNCTIONS  ------------------------- //

var createProjectTests = []*projTest{
	&projTest{
		initializers: []func(t *tester){
			initUserDefault,
		},
		msg:      "Create project",
		method:   "POST",
		endpoint: "/api/projects",
		body: `{
			"name": "project-test"
		}`,
		expStatus: http.StatusCreated,
		expBody:   `{"id":1,"name":"project-test","roles":[{"id":0,"kind":"admin","user_id":1,"project_id":1}]}`,
		useCookie: true,
		validators: []func(c *projTest, tester *tester, t *testing.T){
			projectModelBodyValidator,
		},
	},
}

func TestHandleCreateProject(t *testing.T) {
	testProjRequests(t, createProjectTests, true)
}

var readProjectTests = []*projTest{
	&projTest{
		initializers: []func(t *tester){
			initUserDefault,
			initProject,
		},
		msg:       "Read project",
		method:    "GET",
		endpoint:  "/api/projects/1",
		body:      ``,
		expStatus: http.StatusOK,
		expBody:   `{"id":1,"name":"project-test","roles":[{"id":0,"kind":"admin","user_id":1,"project_id":1}]}`,
		useCookie: true,
		validators: []func(c *projTest, tester *tester, t *testing.T){
			projectModelBodyValidator,
		},
	},
}

func TestHandleReadProject(t *testing.T) {
	testProjRequests(t, readProjectTests, true)
}

var readProjectSATest = []*projTest{
	&projTest{
		initializers: []func(t *tester){
			initUserDefault,
			initProject,
			initProjectSADefault,
		},
		msg:       "Read project service account",
		method:    "GET",
		endpoint:  "/api/projects/1/serviceAccounts/1",
		body:      ``,
		expStatus: http.StatusOK,
		expBody:   `{"id":1,"project_id":1,"kind":"connector","clusters":[{"id":1,"service_account_id":1,"name":"cluster-test","server":"https://localhost"}],"auth_mechanism":"oidc"}`,
		useCookie: true,
		validators: []func(c *projTest, tester *tester, t *testing.T){
			projectSABodyValidator,
		},
	},
}

func TestHandleReadProjectSA(t *testing.T) {
	testProjRequests(t, readProjectSATest, true)
}

var listProjectClustersTest = []*projTest{
	&projTest{
		initializers: []func(t *tester){
			initUserDefault,
			initProject,
			initProjectSADefault,
		},
		msg:       "List project clusters",
		method:    "GET",
		endpoint:  "/api/projects/1/clusters",
		body:      ``,
		expStatus: http.StatusOK,
		expBody:   `[{"id":1,"service_account_id":1,"name":"cluster-test","server":"https://localhost"}]`,
		useCookie: true,
		validators: []func(c *projTest, tester *tester, t *testing.T){
			projectClustersValidator,
		},
	},
}

func TestHandleListProjectClusters(t *testing.T) {
	testProjRequests(t, listProjectClustersTest, true)
}

var createProjectSACandidatesTests = []*projTest{
	&projTest{
		initializers: []func(t *tester){
			initUserDefault,
			initProject,
		},
		msg:       "Create project SA candidate w/ no actions -- should create SA by default",
		method:    "POST",
		endpoint:  "/api/projects/1/candidates",
		body:      `{"kubeconfig":"` + OIDCAuthWithDataForJSON + `"}`,
		expStatus: http.StatusCreated,
		expBody:   `[{"id":1,"actions":[],"created_sa_id":1,"project_id":1,"kind":"connector","context_name":"context-test","cluster_name":"cluster-test","cluster_endpoint":"https://localhost","auth_mechanism":"oidc"}]`,
		useCookie: true,
		validators: []func(c *projTest, tester *tester, t *testing.T){
			projectSACandidateBodyValidator,
			// check that ServiceAccount was created by default
			func(c *projTest, tester *tester, t *testing.T) {
				serviceAccounts, err := tester.repo.ServiceAccount.ListServiceAccountsByProjectID(1)

				if err != nil {
					t.Fatalf("%v\n", err)
				}

				if len(serviceAccounts) != 1 {
					t.Fatal("Expected service account to be created by default, but does not exist\n")
				}

				sa := serviceAccounts[0]

				if len(sa.Clusters) != 1 {
					t.Fatalf("cluster not written\n")
				}

				if sa.Clusters[0].ServiceAccountID != 1 {
					t.Errorf("service account ID of joined cluster is not 1")
				}

				if sa.AuthMechanism != models.OIDC {
					t.Errorf("service account auth mechanism is not %s\n", models.OIDC)
				}

				if string(sa.OIDCCertificateAuthorityData) != "LS0tLS1CRUdJTiBDRVJ=" {
					t.Errorf("service account key data and input do not match: expected %s, got %s\n",
						string(sa.OIDCCertificateAuthorityData), "LS0tLS1CRUdJTiBDRVJ=")
				}

				if sa.OIDCClientID != "porter-api" {
					t.Errorf("service account oidc client id is not %s\n", "porter-api")
				}

				if sa.OIDCIDToken != "token" {
					t.Errorf("service account oidc id token is not %s\n", "token")
				}
			},
		},
	},
	&projTest{
		initializers: []func(t *tester){
			initUserDefault,
			initProject,
		},
		msg:       "Create project SA candidate",
		method:    "POST",
		endpoint:  "/api/projects/1/candidates",
		body:      `{"kubeconfig":"` + OIDCAuthWithoutDataForJSON + `"}`,
		expStatus: http.StatusCreated,
		expBody:   `[{"id":1,"actions":[{"name":"upload-oidc-idp-issuer-ca-data","filename":"/fake/path/to/ca.pem","docs":"https://github.com/porter-dev/porter","resolved":false,"fields":"oidc_idp_issuer_ca_data"}],"project_id":1,"kind":"connector","context_name":"context-test","cluster_name":"cluster-test","cluster_endpoint":"https://localhost","auth_mechanism":"oidc"}]`,
		useCookie: true,
		validators: []func(c *projTest, tester *tester, t *testing.T){
			projectSACandidateBodyValidator,
		},
	},
}

func TestHandleCreateProjectSACandidate(t *testing.T) {
	testProjRequests(t, createProjectSACandidatesTests, true)
}

var listProjectSACandidatesTests = []*projTest{
	&projTest{
		initializers: []func(t *tester){
			initUserDefault,
			initProject,
			initProjectSACandidate,
		},
		msg:       "List project SA candidates",
		method:    "GET",
		endpoint:  "/api/projects/1/candidates",
		body:      ``,
		expStatus: http.StatusOK,
		expBody:   `[{"id":1,"actions":[{"name":"upload-oidc-idp-issuer-ca-data","filename":"/fake/path/to/ca.pem","docs":"https://github.com/porter-dev/porter","resolved":false,"fields":"oidc_idp_issuer_ca_data"}],"project_id":1,"kind":"connector","context_name":"context-test","cluster_name":"cluster-test","cluster_endpoint":"https://localhost","auth_mechanism":"oidc"}]`,
		useCookie: true,
		validators: []func(c *projTest, tester *tester, t *testing.T){
			projectSACandidateBodyValidator,
		},
	},
}

func TestHandleListProjectSACandidates(t *testing.T) {
	testProjRequests(t, listProjectSACandidatesTests, true)
}

var resolveProjectSACandidatesTests = []*projTest{
	&projTest{
		initializers: []func(t *tester){
			initUserDefault,
			initProject,
			initProjectSACandidate,
		},
		msg:       "Resolve project SA candidate",
		method:    "POST",
		endpoint:  "/api/projects/1/candidates/1/resolve",
		body:      `[{"name": "upload-oidc-idp-issuer-ca-data", "oidc_idp_issuer_ca_data": "LS0tLS1CRUdJTiBDRVJ="}]`,
		expStatus: http.StatusCreated,
		expBody:   `{"id":1,"project_id":1,"kind":"connector","clusters":[{"id":1,"service_account_id":1,"name":"cluster-test","server":"https://localhost"}],"auth_mechanism":"oidc"}`,
		useCookie: true,
		validators: []func(c *projTest, tester *tester, t *testing.T){
			projectSABodyValidator,
		},
	},
}

func TestHandleResolveProjectSACandidate(t *testing.T) {
	testProjRequests(t, resolveProjectSACandidatesTests, true)
}

var deleteProjectTests = []*projTest{
	&projTest{
		initializers: []func(t *tester){
			initUserDefault,
			initProject,
		},
		msg:       "Delete project",
		method:    "DELETE",
		endpoint:  "/api/projects/1",
		body:      ``,
		expStatus: http.StatusOK,
		expBody:   `{"id":1,"name":"project-test","roles":[{"id":0,"kind":"admin","user_id":1,"project_id":1}]}`,
		useCookie: true,
		validators: []func(c *projTest, tester *tester, t *testing.T){
			projectModelBodyValidator,
		},
	},
}

func TestHandleDeleteProject(t *testing.T) {
	testProjRequests(t, deleteProjectTests, true)
}

// ------------------------- INITIALIZERS AND VALIDATORS ------------------------- //

func initProject(tester *tester) {
	user, _ := tester.repo.User.ReadUserByEmail("belanger@getporter.dev")

	// handle write to the database
	projModel, _ := tester.repo.Project.CreateProject(&models.Project{
		Name: "project-test",
	})

	// create a new Role with the user as the owner
	tester.repo.Project.CreateProjectRole(projModel, &models.Role{
		UserID:    user.ID,
		ProjectID: projModel.ID,
		Kind:      models.RoleAdmin,
	})
}

func initProjectSACandidate(tester *tester) {
	proj, _ := tester.repo.Project.ReadProject(1)

	form := &forms.CreateServiceAccountCandidatesForm{
		ProjectID:  uint(proj.ID),
		Kubeconfig: OIDCAuthWithoutData,
	}

	// convert the form to a ServiceAccountCandidate
	saCandidates, _ := form.ToServiceAccountCandidates()

	for _, saCandidate := range saCandidates {
		tester.repo.ServiceAccount.CreateServiceAccountCandidate(saCandidate)
	}
}

func initProjectSADefault(tester *tester) {
	proj, _ := tester.repo.Project.ReadProject(1)

	form := &forms.CreateServiceAccountCandidatesForm{
		ProjectID:  uint(proj.ID),
		Kubeconfig: OIDCAuthWithData,
	}

	// convert the form to a ServiceAccountCandidate
	saCandidates, _ := form.ToServiceAccountCandidates()

	for _, saCandidate := range saCandidates {
		tester.repo.ServiceAccount.CreateServiceAccountCandidate(saCandidate)
	}

	saForm := forms.ServiceAccountActionResolver{
		ServiceAccountCandidateID: 1,
	}

	saForm.PopulateServiceAccount(tester.repo.ServiceAccount)
	tester.repo.ServiceAccount.CreateServiceAccount(saForm.SA)
}

func projectBasicBodyValidator(c *projTest, tester *tester, t *testing.T) {
	if body := tester.rr.Body.String(); strings.TrimSpace(body) != strings.TrimSpace(c.expBody) {
		t.Errorf("%s, handler returned wrong body: got %v want %v",
			c.msg, body, c.expBody)
	}
}

func projectModelBodyValidator(c *projTest, tester *tester, t *testing.T) {
	gotBody := &models.ProjectExternal{}
	expBody := &models.ProjectExternal{}

	json.Unmarshal(tester.rr.Body.Bytes(), gotBody)
	json.Unmarshal([]byte(c.expBody), expBody)

	if !reflect.DeepEqual(gotBody, expBody) {
		t.Errorf("%s, handler returned wrong body: got %v want %v",
			c.msg, gotBody, expBody)
	}
}

func projectSACandidateBodyValidator(c *projTest, tester *tester, t *testing.T) {
	gotBody := make([]*models.ServiceAccountCandidateExternal, 0)
	expBody := make([]*models.ServiceAccountCandidateExternal, 0)

	json.Unmarshal(tester.rr.Body.Bytes(), &gotBody)
	json.Unmarshal([]byte(c.expBody), &expBody)

	if !reflect.DeepEqual(gotBody, expBody) {
		t.Errorf("%s, handler returned wrong body: got %v want %v",
			c.msg, gotBody, expBody)
	}
}

func projectSABodyValidator(c *projTest, tester *tester, t *testing.T) {
	gotBody := &models.ServiceAccountExternal{}
	expBody := &models.ServiceAccountExternal{}

	json.Unmarshal(tester.rr.Body.Bytes(), gotBody)
	json.Unmarshal([]byte(c.expBody), expBody)

	if !reflect.DeepEqual(gotBody, expBody) {
		t.Errorf("%s, handler returned wrong body: got %v want %v",
			c.msg, gotBody, expBody)
	}
}

func projectClustersValidator(c *projTest, tester *tester, t *testing.T) {
	gotBody := make([]*models.ClusterExternal, 0)
	expBody := make([]*models.ClusterExternal, 0)

	json.Unmarshal(tester.rr.Body.Bytes(), &gotBody)
	json.Unmarshal([]byte(c.expBody), &expBody)

	if diff := deep.Equal(gotBody, expBody); diff != nil {
		t.Errorf("handler returned wrong body:\n")
		t.Error(diff)
	}
}

const OIDCAuthWithDataForJSON string = `apiVersion: v1\nclusters:\n- cluster:\n    server: https://localhost\n    certificate-authority-data: LS0tLS1CRUdJTiBDRVJ=\n  name: cluster-test\ncontexts:\n- context:\n    cluster: cluster-test\n    user: test-admin\n  name: context-test\ncurrent-context: context-test\nkind: Config\npreferences: {}\nusers:\n- name: test-admin\n  user:\n    auth-provider:\n      config:\n        client-id: porter-api\n        id-token: token\n        idp-issuer-url: https://localhost\n        idp-certificate-authority-data: LS0tLS1CRUdJTiBDRVJ=\n      name: oidc`

const OIDCAuthWithoutDataForJSON string = `apiVersion: v1\nclusters:\n- cluster:\n    server: https://localhost\n    certificate-authority-data: LS0tLS1CRUdJTiBDRVJ=\n  name: cluster-test\ncontexts:\n- context:\n    cluster: cluster-test\n    user: test-admin\n  name: context-test\ncurrent-context: context-test\nkind: Config\npreferences: {}\nusers:\n- name: test-admin\n  user:\n    auth-provider:\n      config:\n        client-id: porter-api\n        id-token: token\n        idp-issuer-url: https://localhost\n        idp-certificate-authority: /fake/path/to/ca.pem\n      name: oidc`

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

const OIDCAuthWithData string = `
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
        idp-certificate-authority-data: LS0tLS1CRUdJTiBDRVJ=
      name: oidc
`
