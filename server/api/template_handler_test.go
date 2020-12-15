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

type templateTest struct {
	initializers []func(tester *tester)
	msg          string
	method       string
	endpoint     string
	body         string
	expStatus    int
	expBody      string
	useCookie    bool
	validators   []func(c *templateTest, tester *tester, t *testing.T)
}

func testTemplatesRequests(t *testing.T, tests []*templateTest, canQuery bool) {
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

// var listTemplatesTests = []*templateTest{
// 	&templateTest{
// 		initializers: []func(tester *tester){
// 			initUserDefault,
// 		},
// 		msg:       "List templates",
// 		method:    "GET",
// 		endpoint:  "/api/templates",
// 		body:      "",
// 		expStatus: http.StatusOK,
// 		expBody:   `[{"name":"Docker","description":"Template to deploy any Docker container on Porter.","icon":"https://cdn4.iconfinder.com/data/icons/logos-and-brands/512/97_Docker_logo_logos-512.png"},{"name":"redis","description":"DEPRECATED Open source, advanced key-value store. It is often referred to as a data structure server since keys can contain strings, hashes, lists, sets and sorted sets.","icon":"https://bitnami.com/assets/stacks/redis/img/redis-stack-220x234.png"}]`,
// 		useCookie: true,
// 		validators: []func(c *templateTest, tester *tester, t *testing.T){
// 			templatesListValidator,
// 		},
// 	},
// }

// func TestHandleListTemplates(t *testing.T) {
// 	testTemplatesRequests(t, listTemplatesTests, true)
// }

// ------------------------- INITIALIZERS AND VALIDATORS ------------------------- //

func templatesListValidator(c *templateTest, tester *tester, t *testing.T) {
	gotBody := make([]*models.PorterChartList, 0)
	expBody := make([]*models.PorterChartList, 0)

	json.Unmarshal(tester.rr.Body.Bytes(), &gotBody)
	json.Unmarshal([]byte(c.expBody), &expBody)

	if diff := deep.Equal(gotBody, expBody); diff != nil {
		t.Errorf("handler returned wrong body:\n")
		t.Error(diff)
	}
}

func templateBodyValidator(c *templateTest, tester *tester, t *testing.T) {
	gotBody := models.PorterChartRead{}
	expBody := models.PorterChartRead{}

	bytes := tester.rr.Body.Bytes()

	t.Errorf(string(bytes))

	json.Unmarshal(bytes, &gotBody)
	json.Unmarshal([]byte(c.expBody), &expBody)

	if diff := deep.Equal(gotBody, expBody); diff != nil {
		t.Errorf("handler returned wrong body:\n")
		t.Error(diff)
	}
}
