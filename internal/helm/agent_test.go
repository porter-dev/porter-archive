package helm_test

import (
	"testing"

	"helm.sh/helm/v3/pkg/storage/driver"

	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/helm"
	"github.com/porter-dev/porter/internal/logger"

	"helm.sh/helm/v3/pkg/chart"
	"helm.sh/helm/v3/pkg/release"
)

func newAgentFixture(t *testing.T, namespace string) *helm.Agent {
	t.Helper()

	l := logger.NewConsole(true)

	form := &helm.Form{
		Namespace: namespace,
	}

	return helm.GetAgentTesting(form, nil, l, nil)
}

type releaseStub struct {
	name         string
	namespace    string
	version      int
	chartVersion string
	status       release.Status
}

// makeReleases adds a slice of releases to the configured storage.
func makeReleases(t *testing.T, agent *helm.Agent, rels []releaseStub) {
	t.Helper()
	storage := agent.ActionConfig.Releases

	for _, r := range rels {
		rel := &release.Release{
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

		err := storage.Create(rel)

		if err != nil {
			t.Fatal(err)
		}
	}
}

func compareReleaseToStubs(t *testing.T, releases []*release.Release, stubs []releaseStub) {
	t.Helper()

	if len(releases) != len(stubs) {
		t.Fatalf("length of release %v doesn't match length of stub %v\n",
			len(releases), len(stubs))
	}

	for i, r := range releases {
		if r.Name != stubs[i].name {
			t.Errorf("Release name %v doesn't match stub name %v\n",
				r.Name, stubs[i].name)
		}

		if r.Namespace != stubs[i].namespace {
			t.Errorf("Release namespace %v doesn't match stub namespace %v\n",
				r.Namespace, stubs[i].namespace)
		}

		if r.Info.Status != stubs[i].status {
			t.Errorf("Release namespace %v doesn't match stub namespace %v\n",
				r.Info.Status, stubs[i].status)
		}

		if r.Version != stubs[i].version {
			t.Errorf("Release version %v doesn't match stub version %v\n",
				r.Version, stubs[i].version)
		}

		if r.Chart.Metadata.Version != stubs[i].chartVersion {
			t.Errorf("Release metadata version %v doesn't match stub chart version %v\n",
				r.Chart.Metadata.Version, stubs[i].chartVersion)
		}
	}

	return
}

type listReleaseTest struct {
	name      string
	namespace string
	filter    *types.ReleaseListFilter
	releases  []releaseStub
	expRes    []releaseStub
}

var listReleaseTests = []listReleaseTest{
	{
		name:      "simple test across namespaces, should sort by name",
		namespace: "",
		filter: &types.ReleaseListFilter{
			Namespace:    "",
			Limit:        20,
			Skip:         0,
			ByDate:       false,
			StatusFilter: []string{"deployed"},
		},
		releases: []releaseStub{
			{"airwatch", "default", 1, "1.0.0", release.StatusDeployed},
			{"wordpress", "default", 1, "1.0.1", release.StatusDeployed},
			{"not-in-default-namespace", "other", 1, "1.0.2", release.StatusDeployed},
		},
		expRes: []releaseStub{
			{"airwatch", "default", 1, "1.0.0", release.StatusDeployed},
			{"not-in-default-namespace", "other", 1, "1.0.2", release.StatusDeployed},
			{"wordpress", "default", 1, "1.0.1", release.StatusDeployed},
		},
	},
	{
		name:      "simple test only default namespace",
		namespace: "default",
		filter: &types.ReleaseListFilter{
			Namespace:    "",
			Limit:        20,
			Skip:         0,
			ByDate:       false,
			StatusFilter: []string{"deployed"},
		},
		releases: []releaseStub{
			{"airwatch", "default", 1, "1.0.0", release.StatusDeployed},
			{"wordpress", "default", 1, "1.0.1", release.StatusDeployed},
			{"not-in-default-namespace", "other", 1, "1.0.2", release.StatusDeployed},
		},
		expRes: []releaseStub{
			{"airwatch", "default", 1, "1.0.0", release.StatusDeployed},
			{"wordpress", "default", 1, "1.0.1", release.StatusDeployed},
		},
	},
	{
		name:      "simple test limit",
		namespace: "",
		filter: &types.ReleaseListFilter{
			Namespace:    "",
			Limit:        2,
			Skip:         0,
			ByDate:       false,
			StatusFilter: []string{"deployed"},
		},
		releases: []releaseStub{
			{"airwatch", "default", 1, "1.0.0", release.StatusDeployed},
			{"not-in-default-namespace", "other", 1, "1.0.1", release.StatusDeployed},
			{"wordpress", "default", 1, "1.0.2", release.StatusDeployed},
		},
		expRes: []releaseStub{
			{"airwatch", "default", 1, "1.0.0", release.StatusDeployed},
			{"not-in-default-namespace", "other", 1, "1.0.1", release.StatusDeployed},
		},
	},
}

func TestListReleases(t *testing.T) {
	for _, tc := range listReleaseTests {
		agent := newAgentFixture(t, tc.namespace)
		makeReleases(t, agent, tc.releases)

		// calling agent.ActionConfig.Releases.Create in makeReleases will automatically set the
		// namespace, so we have to reset the namespace of the storage driver
		agent.ActionConfig.Releases.Driver.(*driver.Memory).SetNamespace(tc.namespace)

		releases, err := agent.ListReleases(tc.namespace, tc.filter)

		if err != nil {
			t.Errorf("%v", err)
		}

		compareReleaseToStubs(t, releases, tc.expRes)
	}
}

type getReleaseTest struct {
	name       string
	namespace  string
	releases   []releaseStub
	getName    string
	getVersion int
	expRes     releaseStub
}

var getReleaseTests = []getReleaseTest{
	{
		name:      "simple get with revision 0 (latest)",
		namespace: "default",
		releases: []releaseStub{
			{"airwatch", "default", 1, "1.0.0", release.StatusDeployed},
			{"wordpress", "default", 1, "1.0.1", release.StatusDeployed},
			{"not-in-default-namespace", "other", 1, "1.0.2", release.StatusDeployed},
		},
		getName:    "airwatch",
		getVersion: 1,
		expRes:     releaseStub{"airwatch", "default", 1, "1.0.0", release.StatusDeployed},
	},
}

func TestGetReleases(t *testing.T) {
	for _, tc := range getReleaseTests {
		agent := newAgentFixture(t, tc.namespace)
		makeReleases(t, agent, tc.releases)

		// calling agent.ActionConfig.Releases.Create in makeReleases will automatically set the
		// namespace, so we have to reset the namespace of the storage driver
		agent.ActionConfig.Releases.Driver.(*driver.Memory).SetNamespace(tc.namespace)

		rel, err := agent.GetRelease(tc.getName, tc.getVersion)

		if err != nil {
			t.Errorf("%v", err)
		}

		compareReleaseToStubs(t, []*release.Release{rel}, []releaseStub{tc.expRes})
	}
}

var listReleaseHistoryTests = []listReleaseTest{
	{
		name:      "simple history test",
		namespace: "default",
		releases: []releaseStub{
			{"wordpress", "default", 2, "1.0.2", release.StatusDeployed},
			{"wordpress", "default", 1, "1.0.1", release.StatusSuperseded},
		},
		expRes: []releaseStub{
			{"wordpress", "default", 1, "1.0.1", release.StatusSuperseded},
			{"wordpress", "default", 2, "1.0.2", release.StatusDeployed},
		},
	},
}

func TestListReleaseHistory(t *testing.T) {
	for _, tc := range listReleaseHistoryTests {
		agent := newAgentFixture(t, tc.namespace)
		makeReleases(t, agent, tc.releases)

		// calling agent.ActionConfig.Releases.Create in makeReleases will automatically set the
		// namespace, so we have to reset the namespace of the storage driver
		agent.ActionConfig.Releases.Driver.(*driver.Memory).SetNamespace(tc.namespace)

		releases, err := agent.GetReleaseHistory("wordpress")

		if err != nil {
			t.Errorf("%v", err)
		}

		compareReleaseToStubs(t, releases, tc.expRes)
	}
}

var upgradeTests = []listReleaseTest{
	{
		name:      "simple history test",
		namespace: "default",
		releases: []releaseStub{
			{"wordpress", "default", 2, "1.0.2", release.StatusDeployed},
			{"wordpress", "default", 1, "1.0.1", release.StatusSuperseded},
		},
		expRes: []releaseStub{
			{"wordpress", "default", 1, "1.0.1", release.StatusSuperseded},
			{"wordpress", "default", 2, "1.0.2", release.StatusSuperseded},
			{"wordpress", "default", 3, "1.0.2", release.StatusDeployed},
		},
	},
}

// func TestUpgradeRelease(t *testing.T) {
// 	for _, tc := range upgradeTests {
// 		agent := newAgentFixture(t, tc.namespace)
// 		makeReleases(t, agent, tc.releases)

// 		// calling agent.ActionConfig.Releases.Create in makeReleases will automatically set the
// 		// namespace, so we have to reset the namespace of the storage driver
// 		agent.ActionConfig.Releases.Driver.(*driver.Memory).SetNamespace(tc.namespace)

// 		agent.UpgradeRelease("wordpress", "", &oauth2.Config{})

// 		releases, err := agent.GetReleaseHistory("wordpress")

// 		if err != nil {
// 			t.Errorf("%v", err)
// 		}

// 		compareReleaseToStubs(t, releases, tc.expRes)
// 	}
// }

var rollbackReleaseTests = []getReleaseTest{
	{
		name:      "simple rollback test",
		namespace: "default",
		releases: []releaseStub{
			{"wordpress", "default", 2, "1.0.2", release.StatusDeployed},
			{"wordpress", "default", 1, "1.0.1", release.StatusSuperseded},
		},
		getName:    "wordpress",
		getVersion: 3,
		expRes:     releaseStub{"wordpress", "default", 3, "1.0.1", release.StatusDeployed},
	},
}

func TestRollbackRelease(t *testing.T) {
	for _, tc := range rollbackReleaseTests {
		agent := newAgentFixture(t, tc.namespace)
		makeReleases(t, agent, tc.releases)

		// calling agent.ActionConfig.Releases.Create in makeReleases will automatically set the
		// namespace, so we have to reset the namespace of the storage driver
		agent.ActionConfig.Releases.Driver.(*driver.Memory).SetNamespace(tc.namespace)

		err := agent.RollbackRelease("wordpress", 1)

		if err != nil {
			t.Errorf("%v", err)
		}

		rel, err := agent.GetRelease(tc.getName, tc.getVersion)

		if err != nil {
			t.Errorf("%v", err)
		}

		compareReleaseToStubs(t, []*release.Release{rel}, []releaseStub{tc.expRes})
	}
}
