package kubernetes_test

import (
	"reflect"
	"testing"

	"github.com/porter-dev/porter/internal/kubernetes"
	"github.com/porter-dev/porter/internal/models"
	"gopkg.in/yaml.v2"
)

type KubeConfigTest struct {
	msg             string
	raw             []byte
	allowedClusters []string
	expected        []models.ClusterConfig
}

var MissingFieldsTest = []KubeConfigTest{
	KubeConfigTest{
		msg:             "no fields at all",
		raw:             []byte(""),
		allowedClusters: []string{},
		expected:        []models.ClusterConfig{},
	},
	KubeConfigTest{
		msg:             "no contexts to join",
		raw:             []byte(noContexts),
		allowedClusters: []string{},
		expected:        []models.ClusterConfig{},
	},
	KubeConfigTest{
		msg:             "no clusters to join",
		raw:             []byte(noClusters),
		allowedClusters: []string{},
		expected:        []models.ClusterConfig{},
	},
	KubeConfigTest{
		msg:             "no users to join",
		raw:             []byte(noUsers),
		allowedClusters: []string{},
		expected:        []models.ClusterConfig{},
	},
	KubeConfigTest{
		msg:             "no cluster contexts to join",
		raw:             []byte(noContextClusters),
		allowedClusters: []string{},
		expected:        []models.ClusterConfig{},
	},
	KubeConfigTest{
		msg:             "no cluster users to join",
		raw:             []byte(noContextUsers),
		allowedClusters: []string{},
		expected:        []models.ClusterConfig{},
	},
}

func TestToClusterConfigsMissingFields(t *testing.T) {
	for _, c := range MissingFieldsTest {
		// take raw and decode
		conf := kubernetes.KubeConfig{}
		err := yaml.Unmarshal(c.raw, &conf)

		if err != nil {
			t.Errorf("Testing: %s, Error: %v\n", c.msg, err)
		}

		res := conf.ToClusterConfigs(c.allowedClusters)

		isEqual := reflect.DeepEqual(c.expected, res)

		if !isEqual {
			t.Errorf("Testing: %s, Expected: %v, Got: %v\n", c.msg, c.expected, res)
		}
	}
}

var NoAllowedClustersTests = []KubeConfigTest{
	KubeConfigTest{
		msg:             "basic test",
		raw:             []byte(basic),
		allowedClusters: []string{},
		expected:        []models.ClusterConfig{},
	},
}

func TestToClusterConfigsNoAllowedClusters(t *testing.T) {
	for _, c := range NoAllowedClustersTests {
		// take raw and decode

		conf := kubernetes.KubeConfig{}
		err := yaml.Unmarshal(c.raw, &conf)

		if err != nil {
			t.Errorf("Testing: %s, Error: %v\n", c.msg, err)
		}

		res := conf.ToClusterConfigs(c.allowedClusters)

		isEqual := reflect.DeepEqual(c.expected, res)

		if !isEqual {
			t.Errorf("Testing: %s, Expected: %v, Got: %v\n", c.msg, c.expected, res)
		}
	}
}

var BasicClustersTests = []KubeConfigTest{
	KubeConfigTest{
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

func TestToClusterConfigsBasic(t *testing.T) {
	for _, c := range BasicClustersTests {
		// take raw and decode
		conf := kubernetes.KubeConfig{}
		err := yaml.Unmarshal(c.raw, &conf)

		if err != nil {
			t.Errorf("Testing: %s, Error: %v\n", c.msg, err)
		}

		res := conf.ToClusterConfigs(c.allowedClusters)

		isEqual := reflect.DeepEqual(c.expected, res)

		if !isEqual {
			t.Errorf("Testing: %s, Expected: %v, Got: %v\n", c.msg, c.expected, res)
		}
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
current-context: default
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
