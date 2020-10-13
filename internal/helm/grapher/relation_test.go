package grapher_test

import (
	"io/ioutil"
	"testing"

	"github.com/porter-dev/porter/internal/helm/grapher"
)

var expControlRels1 = []grapher.ControlRel{
	grapher.ControlRel{
		Relation: grapher.Relation{
			Type:   "ControlRel",
			Source: "my-release-cassandra",
			Target: "temp",
		},
		Replicas: 1,
	},
}

var expControlRels2 = []grapher.ControlRel{
	grapher.ControlRel{
		Relation: grapher.Relation{
			Type:   "ControlRel",
			Source: "my-release-zookeeper",
			Target: "temp",
		},
		Replicas: 1,
	},
	grapher.ControlRel{
		Relation: grapher.Relation{
			Type:   "ControlRel",
			Source: "my-release-kafka",
			Target: "temp",
		},
		Replicas: 1,
	},
}

type test struct {
	Expected []grapher.ControlRel
	FilePath string
}

func TestControlRels(t *testing.T) {
	ts := []test{
		test{
			Expected: expControlRels1,
			FilePath: "./test_yaml/cassandra.yaml",
		},
		test{
			Expected: expControlRels2,
			FilePath: "./test_yaml/kafka.yaml",
		},
	}

	for _, r := range ts {
		// Load in yaml from test files
		file, err := ioutil.ReadFile(r.FilePath)

		if err != nil {
			t.Errorf("Error reading file %s", r.FilePath)
		}

		yamlArr := grapher.ImportMultiDocYAML(file)
		rs := []*grapher.ControlRel{}

		for _, y := range yamlArr {
			strmap := grapher.ConvertYAMLToStringKeys(y)
			if crel := grapher.GetControlRel(strmap); crel != nil {
				rs = append(rs, crel)
			}
		}

		for i, o := range rs {
			if r.Expected[i].Replicas != o.Replicas {
				t.Errorf("Number of Replicas are different at position %d. Expected %d, Got %d\n", i, r.Expected[i].Replicas, o.Replicas)
			}

			if r.Expected[i].Source != o.Source {
				t.Errorf("Source names are different at position %d. Expected %s, Got %s\n", i, r.Expected[i].Source, o.Source)
			}

			if r.Expected[i].Target != o.Target {
				t.Errorf("Target names are different at position %d. Expected %s, Got %s\n", i, r.Expected[i].Target, o.Target)
			}
		}
	}
}
