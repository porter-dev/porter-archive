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
	user, err := tester.repo.User.ReadUserByEmail("belanger@getporter.dev")

	if err != nil {
		panic(err)
	}

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
