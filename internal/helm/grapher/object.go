package grapher

import (
	"encoding/json"
	"strconv"
)

// Object contains information about each k8s component in the chart.
type Object struct {
	Kind      string
	Name      string
	RawYAML   string
	Relations []Relation
}

// ParseObj parses a k8s object from a single-document yaml
// and returns an array of objects that includes its children.
func ParseObj(obj map[string]interface{}) []Object {
	kind := getField(obj, "kind").(string)
	name := getField(obj, "metadata", "name").(string)
	js, _ := json.Marshal(obj)

	// First add the object that appears on the YAML
	parent := Object{
		Kind:      kind,
		Name:      name,
		RawYAML:   string(js),
		Relations: make([]Relation, 0),
	}
	objArr := []Object{}
	objArr = append(objArr, parent)

	switch kind {
	case "Deployment", "StatefulSet", "ReplicaSet", "DaemonSet", "Job":

		rs := getField(obj, "spec", "replicas")
		if rs == nil {
			rs = 0
		}

		// Add Pods for controller objects
		template, _ := json.Marshal(getField(obj, "spec", "template"))
		for i := 0; i < rs.(int); i++ {
			pod := Object{
				Kind:      "Pod",
				Name:      name + "-" + strconv.Itoa(i+1),
				RawYAML:   string(template),
				Relations: make([]Relation, 0),
			}
			objArr = append(objArr, pod)
		}
	}
	return objArr
}
