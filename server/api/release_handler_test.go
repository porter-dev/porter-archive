package api_test

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
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
	name           string
	namespace      string
	version        int
	releaseVersion string
	status         release.Status
}

// ------------------------- TEST TYPES AND MAIN LOOP ------------------------- //

type releaseTest struct {
	initializers []func(tester *tester)
	namespace    string
	msg          string
	method       string
	endpoint     string
	body         string
	expStatus    int
	expBody      string
	useCookie    bool
	validators   []func(c *releaseTest, tester *tester, t *testing.T)
}

func testReleaseRequests(t *testing.T, tests []*releaseTest, canQuery bool) {
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

var listReleasesTests = []*releaseTest{
	&releaseTest{
		initializers: []func(tester *tester){
			initDefaultReleases,
		},
		msg:    "List releases",
		method: "GET",
		endpoint: "/api/releases?" + url.Values{
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
		expBody:   releaseStubsToReleaseJSON(sampleReleaseStubs),
		useCookie: true,
		validators: []func(c *releaseTest, tester *tester, t *testing.T){
			releaseReleaseArrBodyValidator,
		},
	},
	&releaseTest{
		initializers: []func(tester *tester){
			initDefaultReleases,
		},
		msg:       "List releases",
		method:    "GET",
		namespace: "default",
		endpoint: "/api/releases?" + url.Values{
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
		expBody: releaseStubsToReleaseJSON([]releaseStub{
			sampleReleaseStubs[0],
			sampleReleaseStubs[2],
		}),
		useCookie: true,
		validators: []func(c *releaseTest, tester *tester, t *testing.T){
			releaseReleaseArrBodyValidator,
		},
	},
}

func TestHandleListReleases(t *testing.T) {
	testReleaseRequests(t, listReleasesTests, true)
}

var getReleaseTests = []*releaseTest{
	&releaseTest{
		initializers: []func(tester *tester){
			initDefaultReleases,
		},
		msg:       "Get releases",
		method:    "GET",
		namespace: "default",
		endpoint: "/api/releases/airwatch/1?" + url.Values{
			"namespace": []string{""},
			"context":   []string{"context-test"},
			"storage":   []string{"memory"},
		}.Encode(),
		body:      "",
		expStatus: http.StatusOK,
		expBody:   releaseStubToReleaseJSON(sampleReleaseStubs[0]),
		useCookie: true,
		validators: []func(c *releaseTest, tester *tester, t *testing.T){
			releaseReleaseBodyValidator,
		},
	},
}

func TestHandleGetRelease(t *testing.T) {
	testReleaseRequests(t, getReleaseTests, true)
}

var listReleaseHistoryTests = []*releaseTest{
	&releaseTest{
		initializers: []func(tester *tester){
			initHistoryReleases,
		},
		msg:       "List release history",
		method:    "GET",
		namespace: "default",
		endpoint: "/api/releases/wordpress/history?" + url.Values{
			"namespace": []string{""},
			"context":   []string{"context-test"},
			"storage":   []string{"memory"},
		}.Encode(),
		body:      "",
		expStatus: http.StatusOK,
		expBody:   releaseStubsToReleaseJSON(historyReleaseStubs),
		useCookie: true,
		validators: []func(c *releaseTest, tester *tester, t *testing.T){
			releaseReleaseArrBodyValidator,
		},
	},
}

func TestHandleListReleaseHistory(t *testing.T) {
	testReleaseRequests(t, listReleaseHistoryTests, true)
}

var upgradeReleaseTests = []*releaseTest{
	&releaseTest{
		initializers: []func(tester *tester){
			initHistoryReleases,
		},
		msg:       "Upgrade relase",
		method:    "POST",
		namespace: "default",
		endpoint:  "/api/releases/wordpress/upgrade",
		body: `
			{
				"namespace": "default",
				"context": "context-test",
				"storage": "memory",
				"values": "\nfoo: bar\n"
			}
		`,
		expStatus: http.StatusOK,
		expBody:   ``,
		useCookie: true,
		validators: []func(c *releaseTest, tester *tester, t *testing.T){
			func(c *releaseTest, tester *tester, t *testing.T) {
				req, err := http.NewRequest(
					"GET",
					"/api/releases/wordpress/3?"+url.Values{
						"namespace": []string{"default"},
						"context":   []string{"context-test"},
						"storage":   []string{"memory"},
					}.Encode(),
					strings.NewReader(""),
				)

				req.AddCookie(tester.cookie)

				if err != nil {
					t.Fatal(err)
				}

				rr2 := httptest.NewRecorder()
				tester.router.ServeHTTP(rr2, req)

				gotBody := &release.Release{}
				expBody := &release.Release{}

				expBodyJSON := releaseStubToReleaseJSON(releaseStub{"wordpress", "default", 3, "1.0.2", release.StatusDeployed})

				json.Unmarshal(rr2.Body.Bytes(), gotBody)
				json.Unmarshal([]byte(expBodyJSON), expBody)

				// just check name and version match, other items will be different
				if gotBody.Name != expBody.Name {
					t.Errorf("%s, validation wrong body: got %v want %v",
						c.msg, gotBody.Name, expBody.Name)
				}

				if gotBody.Version != expBody.Version {
					t.Errorf("%s, validation wrong body: got %v want %v",
						c.msg, gotBody.Version, expBody.Version)
				}

				expConfig := map[string]interface{}{
					"foo": "bar",
				}

				if !reflect.DeepEqual(gotBody.Config, expConfig) {
					t.Errorf("%s, validation wrong config: got %v want %v",
						c.msg, gotBody.Config, expConfig)
				}
			},
		},
	},
}

func TestUpgradeRelease(t *testing.T) {
	testReleaseRequests(t, upgradeReleaseTests, true)
}

var rollbackReleaseTests = []*releaseTest{
	&releaseTest{
		initializers: []func(tester *tester){
			initHistoryReleases,
		},
		msg:       "Rollback relase",
		method:    "POST",
		namespace: "default",
		endpoint:  "/api/releases/wordpress/rollback",
		body: `
			{
				"namespace": "default",
				"context": "context-test",
				"storage": "memory",
				"revision": 1
			}
		`,
		expStatus: http.StatusOK,
		expBody:   ``,
		useCookie: true,
		validators: []func(c *releaseTest, tester *tester, t *testing.T){
			func(c *releaseTest, tester *tester, t *testing.T) {
				req, err := http.NewRequest(
					"GET",
					"/api/releases/wordpress/3?"+url.Values{
						"namespace": []string{"default"},
						"context":   []string{"context-test"},
						"storage":   []string{"memory"},
					}.Encode(),
					strings.NewReader(""),
				)

				req.AddCookie(tester.cookie)

				if err != nil {
					t.Fatal(err)
				}

				rr2 := httptest.NewRecorder()
				tester.router.ServeHTTP(rr2, req)

				gotBody := &release.Release{}
				expBody := &release.Release{}

				expBodyJSON := releaseStubToReleaseJSON(releaseStub{"wordpress", "default", 3, "1.0.1", release.StatusDeployed})

				fmt.Println(rr2.Body.String())

				json.Unmarshal(rr2.Body.Bytes(), gotBody)
				json.Unmarshal([]byte(expBodyJSON), expBody)

				// just check name and version match, other items will be different
				if gotBody.Name != expBody.Name {
					t.Errorf("%s, validation wrong body: got %v want %v",
						c.msg, gotBody.Name, expBody.Name)
				}

				if gotBody.Version != expBody.Version {
					t.Errorf("%s, validation wrong body: got %v want %v",
						c.msg, gotBody.Version, expBody.Version)
				}
			},
		},
	},
}

func TestRollbackRelease(t *testing.T) {
	testReleaseRequests(t, rollbackReleaseTests, true)
}

// ------------------------- INITIALIZERS AND VALIDATORS ------------------------- //

func initDefaultReleases(tester *tester) {
	initUserDefault(tester)

	agent := tester.app.TestAgents.HelmAgent

	makeReleases(agent, sampleReleaseStubs)

	// calling agent.ActionConfig.Releases.Create in makeReleases will automatically set the
	// namespace, so we have to reset the namespace of the storage driver
	agent.ActionConfig.Releases.Driver.(*driver.Memory).SetNamespace("")
}

func initHistoryReleases(tester *tester) {
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

func releaseStubsToReleaseJSON(rels []releaseStub) string {
	releases := make([]*release.Release, 0)

	for _, r := range rels {
		rel := releaseStubToRelease(r)

		releases = append(releases, rel)
	}

	str, _ := json.Marshal(releases)

	return string(str)
}

func releaseStubToReleaseJSON(r releaseStub) string {
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
				Version: r.releaseVersion,
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

func releaseReleaseBodyValidator(c *releaseTest, tester *tester, t *testing.T) {
	gotBody := &release.Release{}
	expBody := &release.Release{}

	json.Unmarshal(tester.rr.Body.Bytes(), gotBody)
	json.Unmarshal([]byte(c.expBody), expBody)

	if !reflect.DeepEqual(gotBody, expBody) {
		t.Errorf("%s, handler returned wrong body: got %v want %v",
			c.msg, gotBody, expBody)
	}
}

func releaseReleaseArrBodyValidator(c *releaseTest, tester *tester, t *testing.T) {
	gotBody := &[]release.Release{}
	expBody := &[]release.Release{}

	json.Unmarshal(tester.rr.Body.Bytes(), gotBody)
	json.Unmarshal([]byte(c.expBody), expBody)

	if !reflect.DeepEqual(gotBody, expBody) {
		t.Errorf("%s, handler returned wrong body: got %v want %v",
			c.msg, gotBody, expBody)
	}
}
