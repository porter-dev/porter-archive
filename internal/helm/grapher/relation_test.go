package grapher_test

import (
	"io/ioutil"
	"testing"

	"github.com/porter-dev/porter/internal/helm/grapher"
)

var c7 = grapher.Object{
	Kind: "StatefulSet",
	Relations: grapher.Relations{
		ControlRels: []grapher.ControlRel{
			grapher.ControlRel{
				Relation: grapher.Relation{
					Source: 3,
					Target: 4,
				},
				Replicas: 2,
			},
			grapher.ControlRel{
				Relation: grapher.Relation{
					Source: 3,
					Target: 5,
				},
				Replicas: 2,
			},
		},
		LabelRels: []grapher.LabelRel{
			grapher.LabelRel{
				Relation: grapher.Relation{
					Source: 3,
					Target: 4,
				},
			},
			grapher.LabelRel{
				Relation: grapher.Relation{
					Source: 3,
					Target: 5,
				},
			},
		},
	},
}

var c5 = grapher.Object{
	Kind: "Pod",
	Relations: grapher.Relations{
		ControlRels: []grapher.ControlRel{
			grapher.ControlRel{
				Relation: grapher.Relation{
					Source: 3,
					Target: 4,
				},
				Replicas: 2,
			},
		},
		LabelRels: []grapher.LabelRel{
			grapher.LabelRel{
				Relation: grapher.Relation{
					Source: 1,
					Target: 4,
				},
			},
			grapher.LabelRel{
				Relation: grapher.Relation{
					Source: 2,
					Target: 4,
				},
			},
			grapher.LabelRel{
				Relation: grapher.Relation{
					Source: 3,
					Target: 4,
				},
			},
		},
	},
}

var c6 = grapher.Object{
	Kind: "Pod",
	Relations: grapher.Relations{
		ControlRels: []grapher.ControlRel{
			grapher.ControlRel{
				Relation: grapher.Relation{
					Source: 3,
					Target: 5,
				},
				Replicas: 2,
			},
		},
		LabelRels: []grapher.LabelRel{
			grapher.LabelRel{
				Relation: grapher.Relation{
					Source: 1,
					Target: 5,
				},
			},
			grapher.LabelRel{
				Relation: grapher.Relation{
					Source: 2,
					Target: 5,
				},
			},
			grapher.LabelRel{
				Relation: grapher.Relation{
					Source: 3,
					Target: 5,
				},
			},
		},
	},
}

var expControlRels1 = []grapher.Object{
	c1, c2, c3, c7, c5, c6,
}

type test struct {
	Expected []grapher.Object
	FilePath string
}

func TestControlRels(t *testing.T) {
	ts := []test{
		test{
			Expected: expControlRels1,
			FilePath: "./test_yaml/cassandra.yaml",
		},
	}

	for _, r := range ts {
		// Load in yaml from test files
		file, err := ioutil.ReadFile(r.FilePath)

		if err != nil {
			t.Errorf("Error reading file %s", r.FilePath)
		}

		yamlArr := grapher.ImportMultiDocYAML(file)
		objects := grapher.ParseObjs(yamlArr, "default")
		parsed := grapher.ParsedObjs{
			Objects: objects,
		}

		parsed.GetControlRel()

		for i, o := range parsed.Objects {
			e := r.Expected[i]
			if len(e.Relations.ControlRels) != len(o.Relations.ControlRels) {
				t.Errorf("Number of ControlRel differs for %s of type %s. Expected %d. Got %d",
					e.Name, e.Kind, len(e.Relations.ControlRels), len(o.Relations.ControlRels))
			}

			for j, crel := range o.Relations.ControlRels {
				expCrel := e.Relations.ControlRels[j]

				if expCrel.Relation.Source != crel.Relation.Source {
					t.Errorf("Source in ControlRel differs for %s of type %s. Expected %d. Got %d",
						o.Name, o.Kind, expCrel.Relation.Source, crel.Relation.Source)
				}

				if expCrel.Relation.Target != crel.Relation.Target {
					t.Errorf("Target in ControlRel differs for %s of type %s. Expected %d. Got %d",
						o.Name, o.Kind, expCrel.Relation.Target, crel.Relation.Target)
				}

				if expCrel.Replicas != crel.Replicas {
					t.Errorf("Number of replicas in ControlRel differs for %s of type %s. Expected %d. Got %d",
						o.Name, o.Kind, expCrel.Replicas, crel.Replicas)
				}
			}
		}
	}
}

func TestLabelRels(t *testing.T) {
	ts := []test{
		test{
			Expected: expControlRels1,
			FilePath: "./test_yaml/cassandra.yaml",
		},
	}

	for _, r := range ts {
		// Load in yaml from test files
		file, err := ioutil.ReadFile(r.FilePath)

		if err != nil {
			t.Errorf("Error reading file %s", r.FilePath)
		}

		yamlArr := grapher.ImportMultiDocYAML(file)
		objects := grapher.ParseObjs(yamlArr, "default")
		parsed := grapher.ParsedObjs{
			Objects: objects,
		}

		parsed.GetControlRel()
		parsed.GetLabelRel()

		for i, o := range parsed.Objects {
			e := r.Expected[i]
			if len(e.Relations.LabelRels) != len(o.Relations.LabelRels) {
				t.Errorf("Number of LabelRel differs for %s of type %s. Expected %d. Got %d",
					e.Name, e.Kind, len(e.Relations.LabelRels), len(o.Relations.LabelRels))
			}

			for j, rrel := range o.Relations.LabelRels {
				expRrel := e.Relations.LabelRels[j]

				if expRrel.Relation.Source != rrel.Relation.Source {
					t.Errorf("Source in ControlRel differs for %s of type %s. Expected %d. Got %d",
						o.Name, o.Kind, expRrel.Relation.Source, rrel.Relation.Source)
				}

				if expRrel.Relation.Target != rrel.Relation.Target {
					t.Errorf("Target in ControlRel differs for %s of type %s. Expected %d. Got %d",
						o.Name, o.Kind, expRrel.Relation.Target, rrel.Relation.Target)
				}
			}
		}
	}
}

func TestSpecRels(t *testing.T) {
	ts := []test{
		test{
			Expected: expControlRels1,
			FilePath: "./test_yaml/ingress.yaml",
		},
	}

	for _, r := range ts {
		// Load in yaml from test files
		file, err := ioutil.ReadFile(r.FilePath)

		if err != nil {
			t.Errorf("Error reading file %s", r.FilePath)
		}

		yamlArr := grapher.ImportMultiDocYAML(file)
		objects := grapher.ParseObjs(yamlArr, "default")
		parsed := grapher.ParsedObjs{
			Objects: objects,
		}

		parsed.GetControlRel()
		parsed.GetSpecRel()

		// for i, o := range parsed.Objects {
		// e := r.Expected[i]
		// if len(e.Relations.SpecRels) != len(o.Relations.SpecRels) {
		// 	t.Errorf("Number of SpecRel differs for %s of type %s. Expected %d. Got %d",
		// 		e.Name, e.Kind, len(e.Relations.SpecRels), len(o.Relations.SpecRels))
		// }

		// for j, rrel := range o.Relations.SpecRels {
		// 	expRrel := e.Relations.SpecRels[j]

		// 	if expRrel.Relation.Source != rrel.Relation.Source {
		// 		t.Errorf("Source in ControlRel differs for %s of type %s. Expected %d. Got %d",
		// 			o.Name, o.Kind, expRrel.Relation.Source, rrel.Relation.Source)
		// 	}

		// 	if expRrel.Relation.Target != rrel.Relation.Target {
		// 		t.Errorf("Target in ControlRel differs for %s of type %s. Expected %d. Got %d",
		// 			o.Name, o.Kind, expRrel.Relation.Target, rrel.Relation.Target)
		// 	}
		// }
		// }
	}
}
