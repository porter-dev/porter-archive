package kubernetes_test

import (
	"reflect"
	"strings"
	"testing"

	"github.com/porter-dev/porter/internal/kubernetes"
	"github.com/porter-dev/porter/internal/models"
)

type kubeConfigTest struct {
	msg             string
	raw             []byte
	allowedContexts []string
	expected        []models.Context
}

type kubeConfigTestValidateError struct {
	msg             string
	raw             []byte
	allowedContexts []string
	contextName     string
	errorContains   string // a string that the error message should contain
}

var ValidateErrorTests = []kubeConfigTestValidateError{
	kubeConfigTestValidateError{
		msg:             "No configuration",
		raw:             []byte(""),
		allowedContexts: []string{},
		contextName:     "",
		errorContains:   "invalid configuration: no configuration has been provided",
	},
	kubeConfigTestValidateError{
		msg:             "Context name does not exist",
		raw:             []byte(noContexts),
		allowedContexts: []string{"porter-test-1"},
		contextName:     "context-test",
		errorContains:   "invalid configuration: context was not found for specified context: context-test",
	},
	kubeConfigTestValidateError{
		msg:             "Cluster to join does not exist",
		raw:             []byte(noClusters),
		allowedContexts: []string{"porter-test-1"},
		contextName:     "context-test",
		errorContains:   "invalid configuration: context was not found for specified context: context-test",
	},
	kubeConfigTestValidateError{
		msg:             "User to join does not exist",
		raw:             []byte(noUsers),
		allowedContexts: []string{"porter-test-1"},
		contextName:     "context-test",
		errorContains:   "invalid configuration: context was not found for specified context: context-test",
	},
}

func TestValidateErrors(t *testing.T) {
	for _, c := range ValidateErrorTests {

		_, err := kubernetes.GetRestrictedClientConfigFromBytes(c.raw, c.contextName, c.allowedContexts)

		if err == nil {
			t.Fatalf("Testing %s did not return an error\n", c.msg)
		}

		if !strings.Contains(err.Error(), c.errorContains) {
			t.Errorf("Testing %s -- Error was:\n \"%s\" \n It did not contain string \"%s\"\n", c.msg, err.Error(), c.errorContains)
		}
	}
}

var BasicContextAllowedTests = []kubeConfigTest{
	kubeConfigTest{
		msg:             "basic test",
		raw:             []byte(basic),
		allowedContexts: []string{"context-test"},
		expected: []models.Context{
			models.Context{
				Name:     "context-test",
				Server:   "https://localhost",
				Cluster:  "cluster-test",
				User:     "test-admin",
				Selected: true,
			},
		},
	},
}

func TestBasicAllowed(t *testing.T) {
	for _, c := range BasicContextAllowedTests {
		res, err := kubernetes.GetContextsFromBytes(c.raw, c.allowedContexts)

		if err != nil {
			t.Fatalf("Testing %s returned an error: %v\n", c.msg, err.Error())
		}

		isEqual := reflect.DeepEqual(c.expected, res)

		if !isEqual {
			t.Errorf("Testing: %s, Expected: %v, Got: %v\n", c.msg, c.expected, res)
		}
	}
}

var BasicContextAllTests = []kubeConfigTest{
	kubeConfigTest{
		msg:             "basic test",
		raw:             []byte(basic),
		allowedContexts: []string{},
		expected: []models.Context{
			models.Context{
				Name:     "context-test",
				Server:   "https://localhost",
				Cluster:  "cluster-test",
				User:     "test-admin",
				Selected: false,
			},
		},
	},
}

func TestBasicAll(t *testing.T) {
	for _, c := range BasicContextAllTests {
		res, err := kubernetes.GetContextsFromBytes(c.raw, c.allowedContexts)

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
	contexts := []string{"context-test"}
	contextName := "context-test"

	clientConf, err := kubernetes.GetRestrictedClientConfigFromBytes([]byte(basic), contextName, contexts)

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
current-context: context-test
users:
- name: test-admin
  user:
`

const noClusters string = `
apiVersion: v1
kind: Config
preferences: {}
current-context: context-test
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
