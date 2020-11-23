package api_test

import (
	"encoding/json"
	"net/http"
	"strings"
	"testing"

	"github.com/porter-dev/porter/internal/kubernetes"
)

// ------------------------- TEST TYPES AND MAIN LOOP ------------------------- //

type templatesTest struct {
	initializers []func(tester *tester)
	msg          string
	method       string
	endpoint     string
	body         string
	expStatus    int
	expBody      string
	useCookie    bool
	validators   []func(c *templatesTest, tester *tester, t *testing.T)
}

func testTemplatesRequests(t *testing.T, tests []*templatesTest, canQuery bool) {
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

// var listTemplatesTests = []*templatesTest{
// 	&templatesTest{
// 		initializers: []func(tester *tester){
// 			initDefaultTemplates,
// 		},
// 		msg:       "List templates",
// 		method:    "GET",
// 		endpoint:  "/api/templates",
// 		body:      "",
// 		expStatus: http.StatusOK,
// 		expBody:   "unimplemented",
// 		useCookie: true,
// 		validators: []func(c *templatesTest, tester *tester, t *testing.T){
// 			templatesListValidator,
// 		},
// 	},
// }

// func TestHandleListTemplates(t *testing.T) {
// 	testTemplatesRequests(t, listTemplatesTests, true)
// }

// ------------------------- INITIALIZERS AND VALIDATORS ------------------------- //

func initDefaultTemplates(tester *tester) {
	initUserDefault(tester)

	agent := kubernetes.GetAgentTesting(defaultObjects...)

	// overwrite the test agent with new resources
	tester.app.TestAgents.K8sAgent = agent
}

func templatesListValidator(c *templatesTest, tester *tester, t *testing.T) {
	var gotBody map[string]interface{}
	var expBody map[string]interface{}

	json.Unmarshal(tester.rr.Body.Bytes(), &gotBody)
	json.Unmarshal([]byte(c.expBody), &expBody)

	if string(tester.rr.Body.Bytes()) != c.expBody {
		t.Errorf("Mismatch")
	}
}
