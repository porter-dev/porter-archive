package grapher

import "fmt"

// Relation describes the relationship between k8s components. Type is one of CostrolRel, LabelRel, AnnotationsRel, SpecRel.
// Source and Target contains the name of the k8s component that is either the giver or recipient of a relationship.
// All relations are bi-directional in that each object contains both the incoming and outbound relationships.
type Relation struct {
	Type   string
	Source string
	Target string
}

// ControlRel describes the relationship between a controller and its children pod.
type ControlRel struct {
	Relation
	Replicas int
	Template string
}

// =============== helpers for parsing relationships from YAML ===============

// GetControlRel generates relationships and children objects for common k8s controller types.
// Note that this only includes controllers whose children are 1) pods and 2) do not have its own YAML.
// i.e. Children relies entirely on the parent's template. Controllers like CronJob are excluded because its children are not pods.
func GetControlRel(yaml map[string]interface{}) *ControlRel {
	switch kind := getField(yaml, "kind").(string); kind {
	// Parse for all possible controller types
	case "Deployment", "StatefulSet", "ReplicaSet", "DaemonSet", "Job":
		rs := getField(yaml, "spec", "replicas")
		if rs == nil {
			rs = 0
		}

		template := fmt.Sprint(getField(yaml, "spec", "template"))
		crel := &ControlRel{
			Relation: Relation{
				Type:   "ControlRel",
				Source: getField(yaml, "metadata", "name").(string),
				Target: "temp",
			},
			Replicas: rs.(int),
			Template: template,
		}

		return crel
	default:
		return nil
	}
}
