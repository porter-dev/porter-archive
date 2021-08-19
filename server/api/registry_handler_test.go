package api_test

// import (
// 	"encoding/json"
// 	"net/http"
// 	"net/http/httptest"
// 	"strings"
// 	"testing"

// 	"github.com/go-test/deep"
// 	"github.com/porter-dev/porter/internal/kubernetes"
// 	"github.com/porter-dev/porter/internal/models"
// )

// // ------------------------- TEST TYPES AND MAIN LOOP ------------------------- //

// type regTest struct {
// 	initializers []func(t *tester)
// 	msg          string
// 	method       string
// 	endpoint     string
// 	body         string
// 	expStatus    int
// 	expBody      string
// 	useCookie    bool
// 	validators   []func(c *regTest, tester *tester, t *testing.T)
// }

// type imagesTest struct {
// 	initializers []func(tester *tester)
// 	msg          string
// 	method       string
// 	endpoint     string
// 	body         string
// 	expStatus    int
// 	expBody      string
// 	useCookie    bool
// 	validators   []func(c *imagesTest, tester *tester, t *testing.T)
// }

// func testRegistryRequests(t *testing.T, tests []*regTest, canQuery bool) {
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

// func testImagesRequests(t *testing.T, tests []*imagesTest, canQuery bool) {
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

// // var createRegistryTests = []*regTest{
// // 	&regTest{
// // 		initializers: []func(t *tester){
// // 			initUserDefault,
// // 			initProject,
// // 			initAWSIntegration,
// // 		},
// // 		msg:       "Create registry",
// // 		method:    "POST",
// // 		endpoint:  "/api/projects/1/registries",
// // 		body:      `{"name":"registry-test","aws_integration_id":1}`,
// // 		expStatus: http.StatusCreated,
// // 		expBody:   `{"id":1,"name":"registry-test","project_id":1,"service":"ecr"}`,
// // 		useCookie: true,
// // 		validators: []func(c *regTest, tester *tester, t *testing.T){
// // 			regBodyValidator,
// // 		},
// // 	},
// // }

// // func TestHandleCreateRegistry(t *testing.T) {
// // 	testRegistryRequests(t, createRegistryTests, true)
// // }

// var listRegistryTests = []*regTest{
// 	{
// 		initializers: []func(t *tester){
// 			initUserDefault,
// 			initProject,
// 			initRegistry,
// 		},
// 		msg:       "List registries",
// 		method:    "GET",
// 		endpoint:  "/api/projects/1/registries",
// 		body:      ``,
// 		expStatus: http.StatusOK,
// 		expBody:   `[{"id":1,"name":"registry-test","project_id":1,"service":"ecr"}]`,
// 		useCookie: true,
// 		validators: []func(c *regTest, tester *tester, t *testing.T){
// 			regsBodyValidator,
// 		},
// 	},
// }

// func TestHandleListRegistries(t *testing.T) {
// 	testRegistryRequests(t, listRegistryTests, true)
// }

// var updateRegistryTests = []*regTest{
// 	{
// 		initializers: []func(t *tester){
// 			initUserDefault,
// 			initProject,
// 			initRegistry,
// 		},
// 		msg:       "Update registry name",
// 		method:    "POST",
// 		endpoint:  "/api/projects/1/registries/1",
// 		body:      `{"name":"registry-new-name"}`,
// 		expStatus: http.StatusOK,
// 		expBody:   `{"id":1,"name":"registry-new-name","project_id":1,"service":"ecr"}`,
// 		useCookie: true,
// 		validators: []func(c *regTest, tester *tester, t *testing.T){
// 			regBodyValidator,
// 		},
// 	},
// }

// func TestHandleUpdateRegistry(t *testing.T) {
// 	testRegistryRequests(t, updateRegistryTests, true)
// }

// var deleteRegTests = []*regTest{
// 	{
// 		initializers: []func(t *tester){
// 			initUserDefault,
// 			initProject,
// 			initRegistry,
// 		},
// 		msg:       "Delete registry",
// 		method:    "DELETE",
// 		endpoint:  "/api/projects/1/registries/1",
// 		body:      ``,
// 		expStatus: http.StatusOK,
// 		expBody:   ``,
// 		useCookie: true,
// 		validators: []func(c *regTest, tester *tester, t *testing.T){
// 			func(c *regTest, tester *tester, t *testing.T) {
// 				req, err := http.NewRequest(
// 					"GET",
// 					"/api/projects/1/registries",
// 					strings.NewReader(""),
// 				)

// 				req.AddCookie(tester.cookie)

// 				if err != nil {
// 					t.Fatal(err)
// 				}

// 				rr2 := httptest.NewRecorder()

// 				tester.router.ServeHTTP(rr2, req)

// 				if status := rr2.Code; status != 200 {
// 					t.Errorf("DELETE registry validation, handler returned wrong status code: got %v want %v",
// 						status, 200)
// 				}

// 				gotBody := make([]*models.RegistryExternal, 0)
// 				expBody := make([]*models.RegistryExternal, 0)

// 				json.Unmarshal(rr2.Body.Bytes(), &gotBody)

// 				if diff := deep.Equal(gotBody, expBody); diff != nil {
// 					t.Errorf("handler returned wrong body:\n")
// 					t.Error(diff)
// 				}
// 			},
// 		},
// 	},
// }

// func TestHandleDeleteRegistry(t *testing.T) {
// 	testRegistryRequests(t, deleteRegTests, true)
// }

// // ------------------------- INITIALIZERS AND VALIDATORS ------------------------- //

// func initRegistry(tester *tester) {
// 	proj, _ := tester.repo.Project().ReadProject(1)

// 	reg := &models.Registry{
// 		Name:             "registry-test",
// 		ProjectID:        proj.Model.ID,
// 		AWSIntegrationID: 1,
// 	}

// 	tester.repo.Registry().CreateRegistry(reg)
// }

// func regBodyValidator(c *regTest, tester *tester, t *testing.T) {
// 	gotBody := &models.RegistryExternal{}
// 	expBody := &models.RegistryExternal{}

// 	json.Unmarshal(tester.rr.Body.Bytes(), &gotBody)
// 	json.Unmarshal([]byte(c.expBody), &expBody)

// 	if diff := deep.Equal(gotBody, expBody); diff != nil {
// 		t.Errorf("handler returned wrong body:\n")
// 		t.Error(diff)
// 	}
// }

// func regsBodyValidator(c *regTest, tester *tester, t *testing.T) {
// 	gotBody := make([]*models.RegistryExternal, 0)
// 	expBody := make([]*models.RegistryExternal, 0)

// 	json.Unmarshal(tester.rr.Body.Bytes(), &gotBody)
// 	json.Unmarshal([]byte(c.expBody), &expBody)

// 	if diff := deep.Equal(gotBody, expBody); diff != nil {
// 		t.Errorf("handler returned wrong body:\n")
// 		t.Error(diff)
// 	}
// }

// func initDefaultImages(tester *tester) {
// 	initUserDefault(tester)

// 	agent := kubernetes.GetAgentTesting(defaultObjects...)

// 	// overwrite the test agent with new resources
// 	tester.app.TestAgents.K8sAgent = agent
// }

// func imagesListValidator(c *imagesTest, tester *tester, t *testing.T) {
// 	var gotBody map[string]interface{}
// 	var expBody map[string]interface{}

// 	json.Unmarshal(tester.rr.Body.Bytes(), &gotBody)
// 	json.Unmarshal([]byte(c.expBody), &expBody)

// 	if diff := deep.Equal(gotBody, expBody); diff != nil {
// 		t.Errorf("handler returned wrong body:\n")
// 		t.Error(diff)
// 	}
// }
