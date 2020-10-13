package grapher_test

import (
	"io/ioutil"
	"testing"

	"github.com/porter-dev/porter/internal/helm/grapher"
)

// Expected objects for helm Cassandra chart
var c1 = grapher.Object{
	Kind:      "Secret",
	Name:      "my-release-cassandra",
	Relations: make([]grapher.Relation, 0),
}

var c2 = grapher.Object{
	Kind:      "Service",
	Name:      "my-release-cassandra-headless",
	Relations: make([]grapher.Relation, 0),
}

var c3 = grapher.Object{
	Kind:      "Service",
	Name:      "my-release-cassandra",
	Relations: make([]grapher.Relation, 0),
}

var c4 = grapher.Object{
	Kind:      "StatefulSet",
	Name:      "my-release-cassandra",
	Relations: make([]grapher.Relation, 0),
}

var c5 = grapher.Object{
	Kind:      "Pod",
	Name:      "my-release-cassandra-1",
	Relations: make([]grapher.Relation, 0),
}

var c6 = grapher.Object{
	Kind:      "Pod",
	Name:      "my-release-cassandra-2",
	Relations: make([]grapher.Relation, 0),
}

// Expected objects for helm Cassandra chart
var k1 = grapher.Object{
	Kind:      "ServiceAccount",
	Name:      "my-release-kafka",
	Relations: make([]grapher.Relation, 0),
}

var k2 = grapher.Object{
	Kind:      "ConfigMap",
	Name:      "my-release-kafka-scripts",
	Relations: make([]grapher.Relation, 0),
}

var k3 = grapher.Object{
	Kind:      "Service",
	Name:      "my-release-zookeeper-headless",
	Relations: make([]grapher.Relation, 0),
}

var k4 = grapher.Object{
	Kind:      "Service",
	Name:      "my-release-zookeeper",
	Relations: make([]grapher.Relation, 0),
}

var k5 = grapher.Object{
	Kind:      "Service",
	Name:      "my-release-kafka-headless",
	Relations: make([]grapher.Relation, 0),
}

var k6 = grapher.Object{
	Kind:      "Service",
	Name:      "my-release-kafka",
	Relations: make([]grapher.Relation, 0),
}

var k7 = grapher.Object{
	Kind:      "StatefulSet",
	Name:      "my-release-zookeeper",
	Relations: make([]grapher.Relation, 0),
}

var k8 = grapher.Object{
	Kind:      "Pod",
	Name:      "my-release-zookeeper-1",
	Relations: make([]grapher.Relation, 0),
}

var k9 = grapher.Object{
	Kind:      "StatefulSet",
	Name:      "my-release-kafka",
	Relations: make([]grapher.Relation, 0),
}

var k10 = grapher.Object{
	Kind:      "Pod",
	Name:      "my-release-kafka-1",
	Relations: make([]grapher.Relation, 0),
}

var expObjs1 = []grapher.Object{
	c1, c2, c3, c4, c5, c6,
}

var expObjs2 = []grapher.Object{
	k1, k2, k3, k4, k5,
	k6, k7, k8, k9, k10,
}

type k8sObj struct {
	Expected []grapher.Object
	FilePath string
}

func TestParseObj(t *testing.T) {
	k8sObjs := []k8sObj{
		k8sObj{
			Expected: expObjs1,
			FilePath: "./test_yaml/cassandra.yaml",
		},
		k8sObj{
			Expected: expObjs2,
			FilePath: "./test_yaml/kafka.yaml",
		},
	}

	for _, k8sObj := range k8sObjs {
		// Load in yaml from test files
		file, err := ioutil.ReadFile(k8sObj.FilePath)

		if err != nil {
			t.Errorf("Error reading file %s", k8sObj.FilePath)
		}

		yamlArr := grapher.ImportMultiDocYAML(file)
		objects := []grapher.Object{}

		for _, y := range yamlArr {
			strmap := grapher.ConvertYAMLToStringKeys(y)
			objects = append(objects, grapher.ParseObj(strmap)...)
		}

		for i, o := range objects {
			if k8sObj.Expected[i].Kind != o.Kind {
				t.Errorf("Object Kinds are different at position %d. Expected %s, Got %s\n", i, k8sObj.Expected[i].Kind, o.Kind)
			}

			if k8sObj.Expected[i].Name != o.Name {
				t.Errorf("Object names are different at position %d. Expected %s, Got %s\n", i, k8sObj.Expected[i].Name, o.Name)
			}
		}
	}
}
