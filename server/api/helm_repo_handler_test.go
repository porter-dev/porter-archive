package api_test

// import (
// 	"encoding/json"
// 	"net/http"
// 	"strings"
// 	"testing"

// 	"github.com/go-test/deep"
// 	"github.com/porter-dev/porter/internal/models"
// )

// // ------------------------- TEST TYPES AND MAIN LOOP ------------------------- //

// type helmTest struct {
// 	initializers []func(t *tester)
// 	msg          string
// 	method       string
// 	endpoint     string
// 	body         string
// 	expStatus    int
// 	expBody      string
// 	useCookie    bool
// 	validators   []func(c *helmTest, tester *tester, t *testing.T)
// }

// func testHelmRepoRequests(t *testing.T, tests []*helmTest, canQuery bool) {
// 	for _, c := range tests {
// 		// create a new tester
// 		tester := newTester(canQuery)

// 		// if there's an initializer, call it
// 		for _, init := range c.initializers {
// 			init(tester)
// 		}

// 		req, err := http.NewRequest(
// 			c.method,
// 			c.endpoint,
// 			strings.NewReader(c.body),
// 		)

// 		tester.req = req

// 		if c.useCookie {
// 			req.AddCookie(tester.cookie)
// 		}

// 		if err != nil {
// 			t.Fatal(err)
// 		}

// 		tester.execute()
// 		rr := tester.rr

// 		// first, check that the status matches
// 		if status := rr.Code; status != c.expStatus {
// 			t.Errorf("%s, handler returned wrong status code: got %v want %v",
// 				c.msg, status, c.expStatus)
// 		}

// 		// if there's a validator, call it
// 		for _, validate := range c.validators {
// 			validate(c, tester, t)
// 		}
// 	}
// }

// // ------------------------- TEST FIXTURES AND FUNCTIONS  ------------------------- //

// var createHelmRepoTests = []*helmTest{
// 	{
// 		initializers: []func(t *tester){
// 			initUserDefault,
// 			initProject,
// 		},
// 		msg:       "Create helm repo",
// 		method:    "POST",
// 		endpoint:  "/api/projects/1/helmrepos",
// 		body:      `{"name":"helm-repo-test","basic_integration_id":1,"repo_url":"https://example-repo.com"}`,
// 		expStatus: http.StatusCreated,
// 		expBody:   `{"id":1,"project_id":1,"name":"helm-repo-test","repo_name":"https://example-repo.com","service":"helm"}`,
// 		useCookie: true,
// 		validators: []func(c *helmTest, tester *tester, t *testing.T){
// 			helmRepoBodyValidator,
// 		},
// 	},
// }

// func TestHandleCreateHelmRepo(t *testing.T) {
// 	testHelmRepoRequests(t, createHelmRepoTests, true)
// }

// var listHelmReposTest = []*helmTest{
// 	{
// 		initializers: []func(t *tester){
// 			initUserDefault,
// 			initProject,
// 			initHelmRepo,
// 		},
// 		msg:       "List helm repos",
// 		method:    "GET",
// 		endpoint:  "/api/projects/1/helmrepos",
// 		body:      ``,
// 		expStatus: http.StatusOK,
// 		expBody:   `[{"id":1,"project_id":1,"name":"helm-repo-test","repo_name":"https://example-repo.com","service":"helm"}]`,
// 		useCookie: true,
// 		validators: []func(c *helmTest, tester *tester, t *testing.T){
// 			hrsBodyValidator,
// 		},
// 	},
// }

// func TestHandleListHelmRepos(t *testing.T) {
// 	testHelmRepoRequests(t, listHelmReposTest, true)
// }

// // ------------------------- INITIALIZERS AND VALIDATORS ------------------------- //

// func initHelmRepo(tester *tester) {
// 	proj, _ := tester.repo.Project().ReadProject(1)

// 	hr := &models.HelmRepo{
// 		Name:                   "helm-repo-test",
// 		ProjectID:              proj.Model.ID,
// 		RepoURL:                "https://example-repo.com",
// 		BasicAuthIntegrationID: 1,
// 	}

// 	tester.repo.HelmRepo().CreateHelmRepo(hr)
// }

// func helmRepoBodyValidator(c *helmTest, tester *tester, t *testing.T) {
// 	gotBody := &models.HelmRepoExternal{}
// 	expBody := &models.HelmRepoExternal{}

// 	json.Unmarshal(tester.rr.Body.Bytes(), &gotBody)
// 	json.Unmarshal([]byte(c.expBody), &expBody)

// 	if diff := deep.Equal(gotBody, expBody); diff != nil {
// 		t.Errorf("handler returned wrong body:\n")
// 		t.Error(diff)
// 	}
// }

// func hrsBodyValidator(c *helmTest, tester *tester, t *testing.T) {
// 	gotBody := make([]*models.HelmRepoExternal, 0)
// 	expBody := make([]*models.HelmRepoExternal, 0)

// 	json.Unmarshal(tester.rr.Body.Bytes(), &gotBody)
// 	json.Unmarshal([]byte(c.expBody), &expBody)

// 	if diff := deep.Equal(gotBody, expBody); diff != nil {
// 		t.Errorf("handler returned wrong body:\n")
// 		t.Error(diff)
// 	}
// }
