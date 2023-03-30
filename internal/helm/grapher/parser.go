package grapher

import (
	"bytes"
	"fmt"

	"gopkg.in/yaml.v2"
)

// ImportMultiDocYAML is a helper function that goes through a yaml file with multiple documents (or objects)
// separated by '---' or '...' and returns an array of yamls.
func ImportMultiDocYAML(source []byte) (arr []map[string]interface{}) {
	dec := yaml.NewDecoder(bytes.NewReader(source))

	for {
		doc := make(map[interface{}]interface{})
		if dec.Decode(&doc) != nil {
			return arr
		}
		strmap := recursiveConv(doc).(map[string]interface{})
		arr = append(arr, strmap)
	}
}

// recursive helper function that type asserts each layer of nested interfaces to
// retrieve child value. Every call of GetField must be accompanied with a type assertion.
func getField(yaml map[string]interface{}, keys ...string) interface{} {
	if yaml[keys[0]] == nil {
		return nil
	}

	if len(keys) == 1 {
		return yaml[keys[0]]
	}

	return getField(yaml[keys[0]].(map[string]interface{}), keys[1:]...)
}

// recursively convert all key values in generic interface{} format into strings.
// i.e. map[interface{}]interface{} --> map[string]interface{}
func recursiveConv(m interface{}) interface{} {
	switch o := m.(type) {

	// quickly skip if object already has strings as keys
	case map[string]interface{}:
		for k, v := range o {
			o[k] = recursiveConv(v)
		}

	case map[interface{}]interface{}:
		res := make(map[string]interface{})
		for k, v := range o {
			// ✨ sprinkle of efficiency by skipping string keys
			switch kt := k.(type) {
			case string:
				res[kt] = recursiveConv(v)
			default:
				res[fmt.Sprint(kt)] = recursiveConv(v)
			}
		}
		m = res

	case []interface{}:
		for i, v := range o {
			o[i] = recursiveConv(v)
		}
	}

	return m
}
