package api_test

import (
	"encoding/json"
	"net/http"
	"reflect"
	"strings"
	"testing"

	"github.com/porter-dev/porter/internal/config"
	"github.com/porter-dev/porter/internal/helm"
	"github.com/porter-dev/porter/internal/logger"

	"helm.sh/helm/v3/pkg/chart"
	"helm.sh/helm/v3/pkg/release"
	"helm.sh/helm/v3/pkg/storage"
	"helm.sh/helm/v3/pkg/storage/driver"
)

type releaseStub struct {
	name         string
	namespace    string
	version      int
	chartVersion string
	status       release.Status
}

// type ListFilter struct {
// 	Namespace    string   `json:"namespace"`
// 	Limit        int      `json:"limit"`
// 	Skip         int      `json:"skip"`
// 	ByDate       bool     `json:"byDate"`
// 	StatusFilter []string `json:"statusFilter"`
// }

// type Form struct {
// 	KubeConfig      []byte   `form:"required"`
// 	AllowedContexts []string `form:"required"`
// 	Context         string   `json:"context" form:"required"`
// 	Storage         string   `json:"storage" form:"oneof=secret configmap memory"`
// 	Namespace       string   `json:"namespace"`
// }

// type ListChartForm struct {
// 	HelmOptions *helm.Form       `json:"helm" form:"required"`
// 	ListFilter  *helm.ListFilter `json:"filter" form:"required"`
// 	UserID      uint             `json:"user_id"`
// }

// ------------------------- TEST TYPES AND MAIN LOOP ------------------------- //

type chartTest struct {
	initializers []func(tester *tester)
	msg          string
	method       string
	endpoint     string
	body         string
	expStatus    int
	expBody      string
	useCookie    bool
	validators   []func(c *chartTest, tester *tester, t *testing.T)
}

func testChartRequests(t *testing.T, tests []*chartTest, canQuery bool) {
	for _, c := range tests {
		// create a new tester
		storage := helm.StorageMap["memory"](nil, "", nil)
		tester := newTester(canQuery, storage)

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

var listChartsTests = []*chartTest{
	&chartTest{
		initializers: []func(tester *tester){
			initDefaultCharts,
		},
		msg:      "List charts",
		method:   "GET",
		endpoint: "/api/charts",
		body: `{
			"user_id": 1,
			"helm": {
				"namespace": "",
				"context": "context-test",
				"storage": "memory"
			},
			"filter": {
				"namespace": "",
				"limit": 20,
				"skip": 0,
				"byDate": false,
				"statusFilter": ["deployed"]
			}
		}`,
		expStatus: http.StatusOK,
		expBody:   releaseStubsToChartJSON(sampleReleaseStubs),
		useCookie: true,
		validators: []func(c *chartTest, tester *tester, t *testing.T){
			chartReleaseBodyValidator,
		},
	},
}

func TestHandleListCharts(t *testing.T) {
	testChartRequests(t, listChartsTests, true)
}

// ------------------------- INITIALIZERS AND VALIDATORS ------------------------- //

func initDefaultCharts(tester *tester) {
	initUserDefault(tester)

	agent := newAgentFixture("default", tester.app.HelmTestStorageDriver)

	makeReleases(agent, sampleReleaseStubs)

	// calling agent.ActionConfig.Releases.Create in makeReleases will automatically set the
	// namespace, so we have to reset the namespace of the storage driver
	agent.ActionConfig.Releases.Driver.(*driver.Memory).SetNamespace("")
}

func newAgentFixture(namespace string, storage *storage.Storage) *helm.Agent {
	l := logger.NewConsole(true)
	opts := &helm.Form{
		Namespace: namespace,
	}

	agent, _ := opts.ToAgent(l, &config.HelmGlobalConf{
		IsTesting: true,
	}, storage)

	return agent
}

var sampleReleaseStubs = []releaseStub{
	releaseStub{"airwatch", "default", 1, "1.0.0", release.StatusDeployed},
	releaseStub{"not-in-default-namespace", "other", 1, "1.0.1", release.StatusDeployed},
	releaseStub{"wordpress", "default", 1, "1.0.2", release.StatusDeployed},
}

func releaseStubsToChartJSON(rels []releaseStub) string {
	releases := make([]*release.Release, 0)

	for _, r := range rels {
		rel := releaseStubToRelease(r)

		releases = append(releases, rel)
	}

	str, _ := json.Marshal(releases)

	return string(str)
}

func releaseStubToRelease(r releaseStub) *release.Release {
	return &release.Release{
		Name:      r.name,
		Namespace: r.namespace,
		Version:   r.version,
		Info: &release.Info{
			Status: r.status,
		},
		Chart: &chart.Chart{
			Metadata: &chart.Metadata{
				Version: r.chartVersion,
				Icon:    "https://example.com/icon.png",
			},
		},
	}
}

func makeReleases(agent *helm.Agent, rels []releaseStub) {
	storage := agent.ActionConfig.Releases

	for _, r := range rels {
		rel := releaseStubToRelease(r)

		storage.Create(rel)
	}
}

func chartReleaseBodyValidator(c *chartTest, tester *tester, t *testing.T) {
	gotBody := &[]release.Release{}
	expBody := &[]release.Release{}

	json.Unmarshal(tester.rr.Body.Bytes(), gotBody)
	json.Unmarshal([]byte(c.expBody), expBody)

	if !reflect.DeepEqual(gotBody, expBody) {
		t.Errorf("%s, handler returned wrong body: got %v want %v",
			c.msg, gotBody, expBody)
	}
}
