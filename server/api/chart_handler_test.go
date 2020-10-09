package api_test

import (
	"encoding/json"
	"net/http"
	"net/url"
	"reflect"
	"strings"
	"testing"

	"github.com/porter-dev/porter/internal/helm"

	"helm.sh/helm/v3/pkg/chart"
	"helm.sh/helm/v3/pkg/release"
	"helm.sh/helm/v3/pkg/storage/driver"
)

type releaseStub struct {
	name         string
	namespace    string
	version      int
	chartVersion string
	status       release.Status
}

// ------------------------- TEST TYPES AND MAIN LOOP ------------------------- //

type chartTest struct {
	initializers []func(tester *tester)
	namespace    string
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
		tester := newTester(canQuery)

		// if there's an initializer, call it
		for _, init := range c.initializers {
			init(tester)
		}

		tester.app.TestAgents.HelmAgent.ActionConfig.Releases.Driver.(*driver.Memory).SetNamespace(c.namespace)

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
		msg:    "List charts",
		method: "GET",
		endpoint: "/api/charts?" + url.Values{
			"namespace":    []string{""},
			"context":      []string{"context-test"},
			"storage":      []string{"memory"},
			"limit":        []string{"20"},
			"skip":         []string{"0"},
			"byDate":       []string{"false"},
			"statusFilter": []string{"deployed"},
		}.Encode(),
		body:      "",
		expStatus: http.StatusOK,
		expBody:   releaseStubsToChartJSON(sampleReleaseStubs),
		useCookie: true,
		validators: []func(c *chartTest, tester *tester, t *testing.T){
			chartReleaseBodyValidator,
		},
	},
	&chartTest{
		initializers: []func(tester *tester){
			initDefaultCharts,
		},
		msg:       "List charts",
		method:    "GET",
		namespace: "default",
		endpoint: "/api/charts?" + url.Values{
			"namespace":    []string{"default"},
			"context":      []string{"context-test"},
			"storage":      []string{"memory"},
			"limit":        []string{"20"},
			"skip":         []string{"0"},
			"byDate":       []string{"false"},
			"statusFilter": []string{"deployed"},
		}.Encode(),
		body:      "",
		expStatus: http.StatusOK,
		expBody: releaseStubsToChartJSON([]releaseStub{
			sampleReleaseStubs[0],
			sampleReleaseStubs[2],
		}),
		useCookie: true,
		validators: []func(c *chartTest, tester *tester, t *testing.T){
			chartReleaseBodyValidator,
		},
	},
}

func TestHandleListCharts(t *testing.T) {
	testChartRequests(t, listChartsTests, true)
}

var getChartTests = []*chartTest{
	&chartTest{
		initializers: []func(tester *tester){
			initDefaultCharts,
		},
		msg:    "Get charts",
		method: "GET",
		endpoint: "/api/charts/airwatch/1?" + url.Values{
			"namespace": []string{""},
			"context":   []string{"context-test"},
			"storage":   []string{"memory"},
		}.Encode(),
		body:      "",
		expStatus: http.StatusOK,
		expBody:   releaseStubToChartJSON(sampleReleaseStubs[0]),
		useCookie: true,
		validators: []func(c *chartTest, tester *tester, t *testing.T){
			chartReleaseBodyValidator,
		},
	},
}

func TestHandleGetChart(t *testing.T) {
	testChartRequests(t, getChartTests, true)
}

var listChartHistoryTests = []*chartTest{
	&chartTest{
		initializers: []func(tester *tester){
			initHistoryCharts,
		},
		msg:    "List chart history",
		method: "GET",
		endpoint: "/api/charts/wordpress/history?" + url.Values{
			"namespace": []string{""},
			"context":   []string{"context-test"},
			"storage":   []string{"memory"},
		}.Encode(),
		body:      "",
		expStatus: http.StatusOK,
		expBody:   releaseStubsToChartJSON(historyReleaseStubs),
		useCookie: true,
		validators: []func(c *chartTest, tester *tester, t *testing.T){
			chartReleaseBodyValidator,
		},
	},
}

func TestHandleListChartHistory(t *testing.T) {
	testChartRequests(t, listChartHistoryTests, true)
}

var rollbackChartTests = []*chartTest{
	&chartTest{
		initializers: []func(tester *tester){
			initHistoryCharts,
		},
		msg:      "Rollback relase",
		method:   "POST",
		endpoint: "/api/charts/rollback/wordpress/1",
		body: `
			{
				"namespace": "default",
				"context": "context-test",
				"storage": "memory"
			}
		`,
		expStatus: http.StatusOK,
		expBody:   releaseStubsToChartJSON(historyReleaseStubs),
		useCookie: true,
		validators: []func(c *chartTest, tester *tester, t *testing.T){
			func(c *chartTest, tester *tester, t *testing.T) {
				t.Error("asdlkfjasf")
			},
		},
	},
}

func TestRollbackChart(t *testing.T) {
	testChartRequests(t, rollbackChartTests, true)
}

// ------------------------- INITIALIZERS AND VALIDATORS ------------------------- //

func initDefaultCharts(tester *tester) {
	initUserDefault(tester)

	agent := tester.app.TestAgents.HelmAgent

	makeReleases(agent, sampleReleaseStubs)

	// calling agent.ActionConfig.Releases.Create in makeReleases will automatically set the
	// namespace, so we have to reset the namespace of the storage driver
	agent.ActionConfig.Releases.Driver.(*driver.Memory).SetNamespace("")
}

func initHistoryCharts(tester *tester) {
	initUserDefault(tester)

	agent := tester.app.TestAgents.HelmAgent

	makeReleases(agent, historyReleaseStubs)

	// calling agent.ActionConfig.Releases.Create in makeReleases will automatically set the
	// namespace, so we have to reset the namespace of the storage driver
	agent.ActionConfig.Releases.Driver.(*driver.Memory).SetNamespace("")
}

var sampleReleaseStubs = []releaseStub{
	releaseStub{"airwatch", "default", 1, "1.0.0", release.StatusDeployed},
	releaseStub{"not-in-default-namespace", "other", 1, "1.0.1", release.StatusDeployed},
	releaseStub{"wordpress", "default", 1, "1.0.2", release.StatusDeployed},
}

var historyReleaseStubs = []releaseStub{
	releaseStub{"wordpress", "default", 1, "1.0.1", release.StatusSuperseded},
	releaseStub{"wordpress", "default", 2, "1.0.2", release.StatusDeployed},
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

func releaseStubToChartJSON(r releaseStub) string {
	rel := releaseStubToRelease(r)

	str, _ := json.Marshal(rel)

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
