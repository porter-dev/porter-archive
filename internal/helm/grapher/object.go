package grapher

// Object contains information about each k8s component in the chart.
type Object struct {
	Kind      string
	Name      string
	RawYAML   map[string]interface{}
	Relations []Relation
}

// ParseObj aggregates objects in multi-document yaml into an array of objects.
func ParseObj(obj map[string]interface{}) Object {
	kind := getField(obj, "kind").(string)
	name := getField(obj, "metadata", "name").(string)
	return Object{
		Kind:      kind,
		Name:      name,
		RawYAML:   obj,
		Relations: make([]Relation, 0),
	}
}
