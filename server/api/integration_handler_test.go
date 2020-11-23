package api_test

import (
	"encoding/json"
	"net/http"
	"strings"
	"testing"

	"github.com/go-test/deep"
	ints "github.com/porter-dev/porter/internal/models/integrations"
)

// ------------------------- TEST TYPES AND MAIN LOOP ------------------------- //

type publicIntTest struct {
	initializers []func(t *tester)
	msg          string
	method       string
	endpoint     string
	body         string
	expStatus    int
	expBody      string
	useCookie    bool
	validators   []func(c *publicIntTest, tester *tester, t *testing.T)
}

func testPublicIntegrationRequests(t *testing.T, tests []*publicIntTest, canQuery bool) {
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

var listClusterIntegrationsTests = []*publicIntTest{
	&publicIntTest{
		initializers: []func(t *tester){
			initUserDefault,
		},
		msg:       "List cluster integrations",
		method:    "GET",
		endpoint:  "/api/integrations/cluster",
		body:      ``,
		expStatus: http.StatusOK,
		expBody:   `[{"auth_mechanism":"gcp","category":"cluster","service":"gke"},{"auth_mechanism":"aws","category":"cluster","service":"eks"},{"auth_mechanism":"kube","category":"cluster","service":"kube"}]`,
		useCookie: true,
		validators: []func(c *publicIntTest, tester *tester, t *testing.T){
			publicIntBodyValidator,
		},
	},
}

func TestHandleListClusterIntegrations(t *testing.T) {
	testPublicIntegrationRequests(t, listClusterIntegrationsTests, true)
}

var listRegistryIntegrationsTests = []*publicIntTest{
	&publicIntTest{
		initializers: []func(t *tester){
			initUserDefault,
		},
		msg:       "List registry integrations",
		method:    "GET",
		endpoint:  "/api/integrations/registry",
		body:      ``,
		expStatus: http.StatusOK,
		expBody:   `[{"auth_mechanism":"gcp","category":"registry","service":"gcr"},{"auth_mechanism":"aws","category":"registry","service":"ecr"},{"auth_mechanism":"oauth","category":"registry","service":"docker"}]`,
		useCookie: true,
		validators: []func(c *publicIntTest, tester *tester, t *testing.T){
			publicIntBodyValidator,
		},
	},
}

func TestHandleListRegistryIntegrations(t *testing.T) {
	testPublicIntegrationRequests(t, listRegistryIntegrationsTests, true)
}

var listRepoIntegrationsTests = []*publicIntTest{
	&publicIntTest{
		initializers: []func(t *tester){
			initUserDefault,
		},
		msg:       "List repo integrations",
		method:    "GET",
		endpoint:  "/api/integrations/repo",
		body:      ``,
		expStatus: http.StatusOK,
		expBody:   `[{"auth_mechanism":"oauth","category":"repo","service":"github"}]`,
		useCookie: true,
		validators: []func(c *publicIntTest, tester *tester, t *testing.T){
			publicIntBodyValidator,
		},
	},
}

func TestHandleListRepoIntegrations(t *testing.T) {
	testPublicIntegrationRequests(t, listRepoIntegrationsTests, true)
}

// ------------------------- INITIALIZERS AND VALIDATORS ------------------------- //

func publicIntBodyValidator(c *publicIntTest, tester *tester, t *testing.T) {
	gotBody := make([]*ints.PorterIntegration, 0)
	expBody := make([]*ints.PorterIntegration, 0)

	json.Unmarshal(tester.rr.Body.Bytes(), &gotBody)
	json.Unmarshal([]byte(c.expBody), &expBody)

	if diff := deep.Equal(gotBody, expBody); diff != nil {
		t.Errorf("handler returned wrong body:\n")
		t.Error(diff)
	}
}
