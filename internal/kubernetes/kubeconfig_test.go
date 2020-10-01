package kubernetes_test

import (
	"reflect"
	"testing"

	"github.com/porter-dev/porter/internal/kubernetes"
	"github.com/porter-dev/porter/internal/models"
)

type kubeConfigTest struct {
	msg             string
	raw             []byte
	allowedClusters []string
	expected        []models.ClusterConfig
}

// var MissingFieldsTest = []kubeConfigTest{
// 	kubeConfigTest{
// 		msg:             "no fields at all",
// 		raw:             []byte(""),
// 		allowedClusters: []string{},
// 		expected:        []models.ClusterConfig{},
// 	},
// 	kubeConfigTest{
// 		msg:             "no contexts to join",
// 		raw:             []byte(noContexts),
// 		allowedClusters: []string{},
// 		expected:        []models.ClusterConfig{},
// 	},
// 	kubeConfigTest{
// 		msg:             "no clusters to join",
// 		raw:             []byte(noClusters),
// 		allowedClusters: []string{},
// 		expected:        []models.ClusterConfig{},
// 	},
// 	kubeConfigTest{
// 		msg:             "no users to join",
// 		raw:             []byte(noUsers),
// 		allowedClusters: []string{},
// 		expected:        []models.ClusterConfig{},
// 	},
// 	kubeConfigTest{
// 		msg:             "no cluster contexts to join",
// 		raw:             []byte(noContextClusters),
// 		allowedClusters: []string{},
// 		expected:        []models.ClusterConfig{},
// 	},
// 	kubeConfigTest{
// 		msg:             "no cluster users to join",
// 		raw:             []byte(noContextUsers),
// 		allowedClusters: []string{},
// 		expected:        []models.ClusterConfig{},
// 	},
// }

// func TestMissingFields(t *testing.T) {
// 	for _, c := range MissingFieldsTest {
// 		res, err := kubernetes.GetAllowedClusterConfigsFromBytes(c.raw, c.allowedClusters)

// 		if err != nil {
// 			t.Fatalf("Testing %s returned an error: %v\n", c.msg, err.Error())
// 		}

// 		isEqual := reflect.DeepEqual(c.expected, res)

// 		if !isEqual {
// 			t.Errorf("Testing: %s, Expected: %v, Got: %v\n", c.msg, c.expected, res)
// 		}
// 	}
// }

var NoAllowedClustersTests = []kubeConfigTest{
	kubeConfigTest{
		msg:             "basic test",
		raw:             []byte(basic),
		allowedClusters: []string{},
		expected:        []models.ClusterConfig{},
	},
}

func TestNoAllowedClusters(t *testing.T) {
	for _, c := range NoAllowedClustersTests {
		res, err := kubernetes.GetAllowedClusterConfigsFromBytes(c.raw, c.allowedClusters)

		if err != nil {
			t.Fatalf("Testing %s returned an error: %v\n", c.msg, err.Error())
		}

		isEqual := reflect.DeepEqual(c.expected, res)

		if !isEqual {
			t.Errorf("Testing: %s, Expected: %v, Got: %v\n", c.msg, c.expected, res)
		}
	}
}

var BasicClustersAllowedTests = []kubeConfigTest{
	kubeConfigTest{
		msg:             "basic test",
		raw:             []byte(basic),
		allowedClusters: []string{"cluster-test"},
		expected: []models.ClusterConfig{
			models.ClusterConfig{
				Name:    "cluster-test",
				Server:  "https://localhost",
				Context: "context-test",
				User:    "test-admin",
			},
		},
	},
}

func TestBasicAllowed(t *testing.T) {
	for _, c := range BasicClustersAllowedTests {
		res, err := kubernetes.GetAllowedClusterConfigsFromBytes(c.raw, c.allowedClusters)

		if err != nil {
			t.Fatalf("Testing %s returned an error: %v\n", c.msg, err.Error())
		}

		isEqual := reflect.DeepEqual(c.expected, res)

		if !isEqual {
			t.Errorf("Testing: %s, Expected: %v, Got: %v\n", c.msg, c.expected, res)
		}
	}
}

var BasicClustersAllTests = []kubeConfigTest{
	kubeConfigTest{
		msg:             "basic test",
		raw:             []byte(basic),
		allowedClusters: []string{"cluster-test"},
		expected: []models.ClusterConfig{
			models.ClusterConfig{
				Name:    "cluster-test",
				Server:  "https://localhost",
				Context: "context-test",
				User:    "test-admin",
			},
		},
	},
}

func TestBasicAll(t *testing.T) {
	for _, c := range BasicClustersAllTests {
		res, err := kubernetes.GetAllClusterConfigsFromBytes(c.raw)

		if err != nil {
			t.Fatalf("Testing %s returned an error: %v\n", c.msg, err.Error())
		}

		isEqual := reflect.DeepEqual(c.expected, res)

		if !isEqual {
			t.Errorf("Testing: %s, Expected: %v, Got: %v\n", c.msg, c.expected, res)
		}
	}
}

func TestGetRestrictedClientConfig(t *testing.T) {
	clusters := []string{"cluster-test"}
	contextName := "context-test"

	clientConf, err := kubernetes.GetRestrictedClientConfigFromBytes([]byte(basic), contextName, clusters)

	if err != nil {
		t.Fatalf("Fatal error: %s\n", err.Error())
	}

	rawConf, err := clientConf.RawConfig()

	if err != nil {
		t.Fatalf("Fatal error: %s\n", err.Error())
	}

	if cluster, clusterFound := rawConf.Clusters["cluster-test"]; !clusterFound || cluster.Server != "https://localhost" {
		t.Errorf("invalid cluster returned")
	}

	if _, contextFound := rawConf.Contexts["context-test"]; !contextFound {
		t.Errorf("invalid context returned")
	}

	if _, authInfoFound := rawConf.AuthInfos["test-admin"]; !authInfoFound {
		t.Errorf("invalid auth info returned")
	}
}

const noContexts string = `
apiVersion: v1
kind: Config
preferences: {}
clusters:
- cluster:
    server: https://localhost
  name: porter-test-1
current-context: default
users:
- name: test-admin
  user:
`

const noClusters string = `
apiVersion: v1
kind: Config
preferences: {}
current-context: default
contexts:
- context:
    cluster: porter-test-1
    user: test-admin
  name: context-test
users:
- name: test-admin
  user:
`

const noUsers string = `
apiVersion: v1
kind: Config
preferences: {}
current-context: default
clusters:
- cluster:
    server: https://localhost
  name: porter-test-1
contexts:
- context:
    cluster: porter-test-1
    user: test-admin
  name: context-test
`

const noContextClusters string = `
apiVersion: v1
kind: Config
preferences: {}
current-context: default
clusters:
- cluster:
    server: https://localhost
  name: porter-test-1
contexts:
- context:
    # cluster: porter-test-1
    user: test-admin
  name: context-test
users:
- name: test-admin
  user:
`

const noContextUsers string = `
apiVersion: v1
kind: Config
preferences: {}
current-context: default
clusters:
- cluster:
    server: https://localhost
  name: porter-test-1
contexts:
- context:
    cluster: porter-test-1
    # user: test-admin
  name: context-test
users:
- name: test-admin
  user:
`

const basic string = `
apiVersion: v1
kind: Config
preferences: {}
current-context: context-test
clusters:
- cluster:
    server: https://localhost
  name: cluster-test
contexts:
- context:
    cluster: cluster-test
    user: test-admin
  name: context-test
users:
  - name: test-admin
`
