package helm_test

import (
	"io/ioutil"
	"testing"

	"github.com/porter-dev/porter/internal/helm"
	"github.com/porter-dev/porter/internal/logger"

	"helm.sh/helm/v3/pkg/action"
	"helm.sh/helm/v3/pkg/chart"
	"helm.sh/helm/v3/pkg/chartutil"
	kubefake "helm.sh/helm/v3/pkg/kube/fake"
	"helm.sh/helm/v3/pkg/release"
	"helm.sh/helm/v3/pkg/storage"
	"helm.sh/helm/v3/pkg/storage/driver"
)

func newActionConfigFixture(t *testing.T) *action.Configuration {
	t.Helper()

	l := logger.NewConsole(true)

	return &action.Configuration{
		Releases: storage.Init(driver.NewMemory()),
		KubeClient: &kubefake.FailingKubeClient{
			PrintingKubeClient: kubefake.PrintingKubeClient{
				Out: ioutil.Discard,
			},
		},
		Capabilities: chartutil.DefaultCapabilities,
		Log:          l.Printf,
	}
}

type releaseStub struct {
	name         string
	namespace    string
	version      int
	chartVersion string
	status       release.Status
}

// makeReleases adds a slice of releases to the configured storage.
func makeReleases(t *testing.T, actionConfig *action.Configuration, rels []releaseStub) {
	t.Helper()
	storage := actionConfig.Releases
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
	filter    *helm.ListFilter
	releases  []releaseStub
	expRes    []releaseStub
}

var listReleaseTests = []listReleaseTest{
	listReleaseTest{
		name:      "simple test across namespaces, should sort by name",
		namespace: "",
		filter: &helm.ListFilter{
			Namespace:    "",
			Limit:        20,
			Skip:         0,
			ByDate:       false,
			StatusFilter: []string{"deployed"},
		},
		releases: []releaseStub{
			releaseStub{"airwatch", "default", 1, "1.0.0", release.StatusDeployed},
			releaseStub{"wordpress", "default", 1, "1.0.1", release.StatusDeployed},
			releaseStub{"not-in-default-namespace", "other", 1, "1.0.2", release.StatusDeployed},
		},
		expRes: []releaseStub{
			releaseStub{"airwatch", "default", 1, "1.0.0", release.StatusDeployed},
			releaseStub{"not-in-default-namespace", "other", 1, "1.0.2", release.StatusDeployed},
			releaseStub{"wordpress", "default", 1, "1.0.1", release.StatusDeployed},
		},
	},
	listReleaseTest{
		name:      "simple test limit",
		namespace: "",
		filter: &helm.ListFilter{
			Namespace:    "",
			Limit:        2,
			Skip:         0,
			ByDate:       false,
			StatusFilter: []string{"deployed"},
		},
		releases: []releaseStub{
			releaseStub{"airwatch", "default", 1, "1.0.0", release.StatusDeployed},
			releaseStub{"not-in-default-namespace", "other", 1, "1.0.1", release.StatusDeployed},
			releaseStub{"wordpress", "default", 1, "1.0.2", release.StatusDeployed},
		},
		expRes: []releaseStub{
			releaseStub{"airwatch", "default", 1, "1.0.0", release.StatusDeployed},
			releaseStub{"not-in-default-namespace", "other", 1, "1.0.1", release.StatusDeployed},
		},
	},
}

// func TestListReleases(t *testing.T) {
// 	for _, tc := range listReleaseTests {
// 		actionConfig := newActionConfigFixture(t)
// 		makeReleases(t, actionConfig, tc.releases)
// 		actionConfig.Releases.Driver.(*driver.Memory).SetNamespace(tc.namespace)

// 		releases, err := helm.ListReleases(actionConfig, tc.namespace, tc.filter)
// 		if err != nil {
// 			t.Errorf("%v", err)
// 		}

// 		compareReleaseToStubs(t, releases, tc.expRes)
// 	}
// }
