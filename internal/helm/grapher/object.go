package grapher

// Object contains information about each k8s component in the chart.
type Object struct {
	ID        int
	Kind      string
	Name      string
	RawYAML   map[string]interface{}
	Relations Relations
}

// ParseObjs parses a k8s object from a single-document yaml
// and returns an array of objects that includes its children.
func ParseObjs(objs []map[string]interface{}) []Object {
	objArr := []Object{}

	for i, obj := range objs {
		kind := getField(obj, "kind").(string)
		name := getField(obj, "metadata", "name").(string)

		// First add the object that appears on the YAML
		parsedObj := Object{
			ID:      i,
			Kind:    kind,
			Name:    name,
			RawYAML: obj,
			Relations: Relations{
				ControlRels: []ControlRel{},
				LabelRels:   []LabelRel{},
			},
		}
		objArr = append(objArr, parsedObj)
	}
	return objArr
}
