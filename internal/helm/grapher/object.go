package grapher

// Object contains information about each k8s component in the chart.
type Object struct {
	ID        int
	Kind      string
	Name      string
	Namespace string
	RawYAML   map[string]interface{}
	Relations Relations
}

// ParseObjs parses a k8s object from a single-document yaml
// and returns an array of objects that includes its children.
func ParseObjs(objs []map[string]interface{}) []Object {
	objArr := []Object{}

	for i, obj := range objs {
		kind := getField(obj, "kind")

		// ignore block comments
		if kind == nil {
			continue
		}

		name := getField(obj, "metadata", "name")
		namespace := getField(obj, "metadata", "namespace")

		if namespace == nil {
			namespace = "default"
		}

		if name == nil {
			name = ""
		}

		// First add the object that appears on the YAML
		parsedObj := Object{
			ID:        i,
			Kind:      kind.(string),
			Name:      name.(string),
			Namespace: namespace.(string),
			RawYAML:   obj,
			Relations: Relations{
				ControlRels: []ControlRel{},
				LabelRels:   []LabelRel{},
				SpecRels:    []SpecRel{},
			},
		}
		objArr = append(objArr, parsedObj)
	}
	return objArr
}

// ParseControllers parses a k8s object from a single-document yaml
// and returns an array of controllers.
func ParseControllers(objs []map[string]interface{}) []Object {
	objArr := []Object{}

	for i, obj := range objs {
		kind := getField(obj, "kind")

		// ignore block comments
		if kind == nil {
			continue
		}

		switch kind.(string) {
		// Parse for all possible controller types
		case "Deployment", "StatefulSet", "ReplicaSet", "DaemonSet", "Job", "CronJob":
			name := getField(obj, "metadata", "name")
			namespace := getField(obj, "metadata", "namespace")

			if namespace == nil {
				namespace = "default"
			}

			if name == nil {
				name = ""
			}

			// First add the object that appears on the YAML
			parsedObj := Object{
				ID:        i,
				Kind:      kind.(string),
				Name:      name.(string),
				Namespace: namespace.(string),
			}
			objArr = append(objArr, parsedObj)
		}

	}
	return objArr
}
