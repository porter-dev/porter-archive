package grapher

import (
	"strconv"
)

// Relation describes the relationship between k8s components. Type is one of CostrolRel, LabelRel, AnnotationsRel, SpecRel.
// Source and Target contains the ID of the k8s component that is either the giver or recipient of a relationship.
// All relations are bi-directional in that each object contains both the incoming and outbound relationships.
type Relation struct {
	Source int
	Target int
}

// ControlRel describes the relationship between a controller and its children pod.
type ControlRel struct {
	Relation
	Replicas int
	Template map[string]interface{}
}

type LabelRel struct {
	Relation
}

type ParsedObjs struct {
	Objects []Object
}

type Relations struct {
	ControlRels []ControlRel
	LabelRels   []LabelRel
}

type MatchLabel struct {
	key   string
	value string
}

type MatchExpression struct {
	key      string
	operator string // In, NotIn, Exists, DoesNotExist are valid
	values   []string
}

// =============== helpers for parsing relationships from YAML ===============

// GetControlRel generates relationships and children objects for common k8s controller types.
// Note that this only includes controllers whose children are 1) pods and 2) do not have its own YAML.
// i.e. Children relies entirely on the parent's template. Controllers like CronJob are excluded because its children are not pods.
func (parsed *ParsedObjs) GetControlRel() {
	// First collect all children.
	children := []Object{}
	for i, obj := range parsed.Objects {
		yaml := obj.RawYAML

		switch kind := getField(yaml, "kind").(string); kind {
		// Parse for all possible controller types
		case "Deployment", "StatefulSet", "ReplicaSet", "DaemonSet", "Job":
			rs := getField(yaml, "spec", "replicas")

			if rs != nil && rs.(int) > 0 {
				// Add Pods for controller objects
				template := getField(yaml, "spec", "template").(map[string]interface{})
				for j := 0; j < rs.(int); j++ {
					cid := len(parsed.Objects) + len(children)
					crel := ControlRel{
						Relation: Relation{
							Source: obj.ID,
							Target: cid,
						},
						Replicas: rs.(int),
					}

					pod := Object{
						ID:      cid,
						Kind:    "Pod",
						Name:    obj.Name + "-" + strconv.Itoa(i), // tentative name pre-deploy
						RawYAML: template,
						Relations: Relations{
							ControlRels: []ControlRel{
								crel,
							},
						},
					}

					children = append(children, pod)
					obj.Relations.ControlRels = append(obj.Relations.ControlRels, crel)
					parsed.Objects[i] = obj
				}
			}
		}
	}

	// add children to the objects array
	parsed.Objects = append(parsed.Objects, children...)
}

// GetLabelRel is sdflk
func (parsed *ParsedObjs) GetLabelRel() {
	for i, o := range parsed.Objects {
		yaml := o.RawYAML
		matchLabels := []MatchLabel{}
		matchExpressions := []MatchExpression{}

		if l := getField(yaml, "spec", "selector"); l != nil {
			simple := true
			if ml := getField(yaml, "spec", "selector", "matchLabels"); ml != nil {
				matchLabels = addMatchLabels(matchLabels, ml.(map[string]interface{}))
				simple = false
			}

			if me := getField(yaml, "spec", "selector", "matchExpressions"); me != nil {
				for _, o := range me.([]interface{}) {
					ot := o.(map[string]interface{})
					values := []string{}
					for _, arg := range ot["values"].([]interface{}) {
						values = append(values, arg.(string))
					}
					matchExpressions = append(matchExpressions, MatchExpression{
						key:      ot["key"].(string),
						operator: ot["operator"].(string),
						values:   values,
					})
				}
				simple = false
			}

			if simple {
				matchLabels = addMatchLabels(matchLabels, l.(map[string]interface{}))
			}
		}
		// fmt.Println("For object", o.Name)
		// fmt.Println("matchLabels", matchLabels)
		// fmt.Println("matchExp", matchExpressions)

		targetID := parsed.findLabelsBySelector(matchLabels, matchExpressions)
		lrels := o.Relations.LabelRels
		for _, tid := range targetID {
			newrel := LabelRel{
				Relation{
					Source: o.ID,
					Target: tid,
				},
			}
			lrels = append(lrels, newrel)
		}

		parsed.Objects[i].Relations.LabelRels = lrels
	}
}

func addMatchLabels(matchLabels []MatchLabel, ml map[string]interface{}) []MatchLabel {
	for k, v := range ml {
		matchLabels = append(matchLabels, MatchLabel{
			key:   k,
			value: v.(string),
		})
	}
	return matchLabels
}

func (parsed *ParsedObjs) findLabelsBySelector(ml []MatchLabel, me []MatchExpression) []int {
	matchedObjs := []int{}
	for _, o := range parsed.Objects {
		// find objects that match labels
		labels := getField(o.RawYAML, "metadata", "labels")
		match := 0
		for _, l := range ml {
			if labels.(map[string]interface{})[l.key] == l.value {
				match++
			}
		}
		if match == len(ml) && match > 0 {
			matchedObjs = append(matchedObjs, o.ID)
		}
	}
	return matchedObjs
}
