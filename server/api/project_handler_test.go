package api_test

import (
	"encoding/json"
	"net/http"
	"strings"
	"testing"

	"github.com/porter-dev/porter/internal/kubernetes/fixtures"
	"github.com/porter-dev/porter/internal/models/integrations"
	"gorm.io/gorm"

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

var readProjectClusterTest = []*projTest{
	&projTest{
		initializers: []func(t *tester){
			initUserDefault,
			initProject,
			initProjectClusterDefault,
		},
		msg:       "Read project cluster",
		method:    "GET",
		endpoint:  "/api/projects/1/clusters/1",
		body:      ``,
		expStatus: http.StatusOK,
		expBody:   `{"id":1,"project_id":1,"name":"cluster-test","server":"https://10.10.10.10"}`,
		useCookie: true,
		validators: []func(c *projTest, tester *tester, t *testing.T){
			projectClusterBodyValidator,
		},
	},
}

func TestHandleReadProjectSA(t *testing.T) {
	testProjRequests(t, readProjectClusterTest, true)
}

var listProjectClustersTest = []*projTest{
	&projTest{
		initializers: []func(t *tester){
			initUserDefault,
			initProject,
			initProjectClusterDefault,
		},
		msg:       "List project clusters",
		method:    "GET",
		endpoint:  "/api/projects/1/clusters",
		body:      ``,
		expStatus: http.StatusOK,
		expBody:   `[{"id":1,"project_id":1,"name":"cluster-test","server":"https://10.10.10.10"}]`,
		useCookie: true,
		validators: []func(c *projTest, tester *tester, t *testing.T){
			projectClustersBodyValidator,
		},
	},
}

func TestHandleListProjectClusters(t *testing.T) {
	testProjRequests(t, listProjectClustersTest, true)
}

var createProjectClusterCandidatesTests = []*projTest{
	&projTest{
		initializers: []func(t *tester){
			initUserDefault,
			initProject,
		},
		msg:       "Create project cluster candidate w/ no actions -- should create SA by default",
		method:    "POST",
		endpoint:  "/api/projects/1/clusters/candidates",
		body:      `{"kubeconfig":"` + OIDCAuthWithDataForJSON + `"}`,
		expStatus: http.StatusCreated,
		expBody:   `[{"id":1,"resolvers":[],"created_cluster_id":1,"project_id":1,"context_name":"context-test","name":"cluster-test","server":"https://10.10.10.10"}]`,
		useCookie: true,
		validators: []func(c *projTest, tester *tester, t *testing.T){
			projectClusterCandidateBodyValidator,
			// check that Cluster was created by default
			func(c *projTest, tester *tester, t *testing.T) {
				clusters, err := tester.repo.Cluster.ListClustersByProjectID(1)

				if err != nil {
					t.Fatalf("%v\n", err)
				}

				if len(clusters) != 1 {
					t.Fatal("Expected cluster to be created by default, but does not exist\n")
				}

				gotCluster := clusters[0]
				gotCluster.Model = gorm.Model{}

				expCluster := &models.Cluster{
					AuthMechanism:            models.OIDC,
					ProjectID:                1,
					Name:                     "cluster-test",
					Server:                   "https://10.10.10.10",
					OIDCIntegrationID:        1,
					TokenCache:               integrations.TokenCache{},
					CertificateAuthorityData: []byte("-----BEGIN CER"),
				}

				if diff := deep.Equal(gotCluster, expCluster); diff != nil {
					t.Errorf("handler returned wrong body:\n")
					t.Error(diff)
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
		endpoint:  "/api/projects/1/clusters/candidates",
		body:      `{"kubeconfig":"` + OIDCAuthWithoutDataForJSON + `"}`,
		expStatus: http.StatusCreated,
		expBody:   `[{"id":1,"resolvers":[{"name":"upload-oidc-idp-issuer-ca-data","data":{"filename":"/fake/path/to/ca.pem"},"docs":"https://github.com/porter-dev/porter","resolved":false,"fields":"oidc_idp_issuer_ca_data"}],"created_cluster_id":0,"project_id":1,"context_name":"context-test","name":"cluster-test","server":"https://10.10.10.10"}]`,
		useCookie: true,
		validators: []func(c *projTest, tester *tester, t *testing.T){
			projectClusterCandidateBodyValidator,
		},
	},
}

func TestHandleCreateProjectClusterCandidate(t *testing.T) {
	testProjRequests(t, createProjectClusterCandidatesTests, true)
}

var listProjectClusterCandidatesTests = []*projTest{
	&projTest{
		initializers: []func(t *tester){
			initUserDefault,
			initProject,
			initProjectClusterCandidate,
		},
		msg:       "List project cluster candidates",
		method:    "GET",
		endpoint:  "/api/projects/1/clusters/candidates",
		body:      ``,
		expStatus: http.StatusOK,
		expBody:   `[{"id":1,"resolvers":[{"name":"upload-oidc-idp-issuer-ca-data","data":{"filename":"/fake/path/to/ca.pem"},"docs":"https://github.com/porter-dev/porter","resolved":false,"fields":"oidc_idp_issuer_ca_data"}],"created_cluster_id":0,"project_id":1,"context_name":"context-test","name":"cluster-test","server":"https://10.10.10.10"}]`,
		useCookie: true,
		validators: []func(c *projTest, tester *tester, t *testing.T){
			projectClusterCandidateBodyValidator,
		},
	},
}

func TestHandleListProjectClusterCandidates(t *testing.T) {
	testProjRequests(t, listProjectClusterCandidatesTests, true)
}

var resolveProjectClusterCandidatesTests = []*projTest{
	&projTest{
		initializers: []func(t *tester){
			initUserDefault,
			initProject,
			initProjectClusterCandidate,
		},
		msg:       "Resolve project cluster candidate",
		method:    "POST",
		endpoint:  "/api/projects/1/clusters/candidates/1/resolve",
		body:      `{"oidc_idp_issuer_ca_data": "LS0tLS1CRUdJTiBDRVJ="}`,
		expStatus: http.StatusCreated,
		expBody:   `{"id":1,"project_id":1,"name":"cluster-test","server":"https://10.10.10.10"}`,
		useCookie: true,
		validators: []func(c *projTest, tester *tester, t *testing.T){
			projectClusterBodyValidator,
		},
	},
}

func TestHandleResolveProjectClusterCandidate(t *testing.T) {
	testProjRequests(t, resolveProjectClusterCandidatesTests, true)
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

func initProjectClusterCandidate(tester *tester) {
	proj, _ := tester.repo.Project.ReadProject(1)

	form := &forms.CreateClusterCandidatesForm{
		ProjectID:  proj.ID,
		Kubeconfig: fixtures.OIDCAuthWithoutData,
	}

	// convert the form to a ServiceAccountCandidate
	ccs, _ := form.ToClusterCandidates(false)

	for _, cc := range ccs {
		tester.repo.Cluster.CreateClusterCandidate(cc)
	}
}

func initProjectClusterDefault(tester *tester) {
	proj, _ := tester.repo.Project.ReadProject(1)

	form := &forms.CreateClusterCandidatesForm{
		ProjectID:  proj.ID,
		Kubeconfig: fixtures.OIDCAuthWithData,
	}

	// convert the form to a ServiceAccountCandidate
	ccs, _ := form.ToClusterCandidates(false)

	for _, cc := range ccs {
		tester.repo.Cluster.CreateClusterCandidate(cc)
	}

	clusterForm := forms.ResolveClusterForm{
		Resolver:           &models.ClusterResolverAll{},
		ClusterCandidateID: 1,
		ProjectID:          1,
		UserID:             1,
	}

	clusterForm.ResolveIntegration(*tester.repo)
	clusterForm.ResolveCluster(*tester.repo)
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

	if diff := deep.Equal(gotBody, expBody); diff != nil {
		t.Errorf("handler returned wrong body:\n")
		t.Error(diff)
	}
}

func projectClusterCandidateBodyValidator(c *projTest, tester *tester, t *testing.T) {
	gotBody := make([]*models.ClusterCandidateExternal, 0)
	expBody := make([]*models.ClusterCandidateExternal, 0)

	json.Unmarshal(tester.rr.Body.Bytes(), &gotBody)
	json.Unmarshal([]byte(c.expBody), &expBody)

	if diff := deep.Equal(gotBody, expBody); diff != nil {
		t.Errorf("handler returned wrong body:\n")
		t.Error(diff)
	}
}

func projectClusterBodyValidator(c *projTest, tester *tester, t *testing.T) {
	gotBody := &models.ClusterExternal{}
	expBody := &models.ClusterExternal{}

	json.Unmarshal(tester.rr.Body.Bytes(), gotBody)
	json.Unmarshal([]byte(c.expBody), expBody)

	if diff := deep.Equal(gotBody, expBody); diff != nil {
		t.Errorf("handler returned wrong body:\n")
		t.Error(diff)
	}
}

func projectClustersBodyValidator(c *projTest, tester *tester, t *testing.T) {
	gotBody := make([]*models.ClusterExternal, 0)
	expBody := make([]*models.ClusterExternal, 0)

	json.Unmarshal(tester.rr.Body.Bytes(), &gotBody)
	json.Unmarshal([]byte(c.expBody), &expBody)

	if diff := deep.Equal(gotBody, expBody); diff != nil {
		t.Errorf("handler returned wrong body:\n")
		t.Error(diff)
	}
}

const OIDCAuthWithDataForJSON string = `apiVersion: v1\nclusters:\n- cluster:\n    server: https://10.10.10.10\n    certificate-authority-data: LS0tLS1CRUdJTiBDRVJ=\n  name: cluster-test\ncontexts:\n- context:\n    cluster: cluster-test\n    user: test-admin\n  name: context-test\ncurrent-context: context-test\nkind: Config\npreferences: {}\nusers:\n- name: test-admin\n  user:\n    auth-provider:\n      config:\n        client-id: porter-api\n        id-token: token\n        idp-issuer-url: https://10.10.10.10\n        idp-certificate-authority-data: LS0tLS1CRUdJTiBDRVJ=\n      name: oidc`

const OIDCAuthWithoutDataForJSON string = `apiVersion: v1\nclusters:\n- cluster:\n    server: https://10.10.10.10\n    certificate-authority-data: LS0tLS1CRUdJTiBDRVJ=\n  name: cluster-test\ncontexts:\n- context:\n    cluster: cluster-test\n    user: test-admin\n  name: context-test\ncurrent-context: context-test\nkind: Config\npreferences: {}\nusers:\n- name: test-admin\n  user:\n    auth-provider:\n      config:\n        client-id: porter-api\n        id-token: token\n        idp-issuer-url: https://10.10.10.10\n        idp-certificate-authority: /fake/path/to/ca.pem\n      name: oidc`

const OIDCAuthWithoutData string = `
apiVersion: v1
clusters:
- cluster:
    server: https://10.10.10.10
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
        idp-issuer-url: https://10.10.10.10
        idp-certificate-authority: /fake/path/to/ca.pem
      name: oidc
`

const OIDCAuthWithData string = `
apiVersion: v1
clusters:
- cluster:
    server: https://10.10.10.10
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
        idp-issuer-url: https://10.10.10.10
        idp-certificate-authority-data: LS0tLS1CRUdJTiBDRVJ=
      name: oidc
`
