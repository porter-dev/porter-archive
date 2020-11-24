package api_test

import (
	"encoding/json"
	"net/http"
	"strings"
	"testing"

	"github.com/go-test/deep"
	"github.com/porter-dev/porter/internal/models"
)

// ------------------------- TEST TYPES AND MAIN LOOP ------------------------- //

type regTest struct {
	initializers []func(t *tester)
	msg          string
	method       string
	endpoint     string
	body         string
	expStatus    int
	expBody      string
	useCookie    bool
	validators   []func(c *regTest, tester *tester, t *testing.T)
}

func testRegistryRequests(t *testing.T, tests []*regTest, canQuery bool) {
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

var createRegistryTests = []*regTest{
	&regTest{
		initializers: []func(t *tester){
			initUserDefault,
			initProject,
		},
		msg:       "Create registry",
		method:    "POST",
		endpoint:  "/api/projects/1/registries",
		body:      `{"name":"registry-test","aws_integration_id":1}`,
		expStatus: http.StatusCreated,
		expBody:   `{"id":1,"name":"registry-test","project_id":1}`,
		useCookie: true,
		validators: []func(c *regTest, tester *tester, t *testing.T){
			regBodyValidator,
		},
	},
}

func TestHandleCreateRegistry(t *testing.T) {
	testRegistryRequests(t, createRegistryTests, true)
}

var listRegistryTests = []*regTest{
	&regTest{
		initializers: []func(t *tester){
			initUserDefault,
			initProject,
			initRegistry,
		},
		msg:       "List registries",
		method:    "GET",
		endpoint:  "/api/projects/1/registries",
		body:      ``,
		expStatus: http.StatusOK,
		expBody:   `[{"id":1,"name":"registry-test","project_id":1}]`,
		useCookie: true,
		validators: []func(c *regTest, tester *tester, t *testing.T){
			regsBodyValidator,
		},
	},
}

func TestHandleListRegistries(t *testing.T) {
	testRegistryRequests(t, listRegistryTests, true)
}

// ------------------------- INITIALIZERS AND VALIDATORS ------------------------- //

func initRegistry(tester *tester) {
	proj, _ := tester.repo.Project.ReadProject(1)

	reg := &models.Registry{
		Name:             "registry-test",
		ProjectID:        proj.Model.ID,
		AWSIntegrationID: 1,
	}

	tester.repo.Registry.CreateRegistry(reg)
}

func regBodyValidator(c *regTest, tester *tester, t *testing.T) {
	gotBody := &models.Registry{}
	expBody := &models.Registry{}

	json.Unmarshal(tester.rr.Body.Bytes(), &gotBody)
	json.Unmarshal([]byte(c.expBody), &expBody)

	if diff := deep.Equal(gotBody, expBody); diff != nil {
		t.Errorf("handler returned wrong body:\n")
		t.Error(diff)
	}
}

func regsBodyValidator(c *regTest, tester *tester, t *testing.T) {
	gotBody := make([]*models.Registry, 0)
	expBody := make([]*models.Registry, 0)

	json.Unmarshal(tester.rr.Body.Bytes(), &gotBody)
	json.Unmarshal([]byte(c.expBody), &expBody)

	if diff := deep.Equal(gotBody, expBody); diff != nil {
		t.Errorf("handler returned wrong body:\n")
		t.Error(diff)
	}
}
