package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"

	"gopkg.in/yaml.v2"
)

func main() {
	file, err := ioutil.ReadFile("./manifest.yaml")

	if err != nil {
		panic("AHHHHHH")
	}

	yamlArr := Parse(file)

	for _, v := range yamlArr {
		strmap := convertYAMLToJSON(v)
		js, err := json.Marshal(strmap)
		if err != nil {
			fmt.Println(err)
		}
		fmt.Println(string(js))
	}
}

// Parse is a helper function that goes through a yaml file with multiple documents (or objects)
// separated by '---' or '...' and returns an array of yamls.
func Parse(source []byte) (arr []map[interface{}]interface{}) {
	dec := yaml.NewDecoder(bytes.NewReader(source))

	for {
		doc := make(map[interface{}]interface{})
		if dec.Decode(&doc) != nil {
			return arr
		}
		arr = append(arr, doc)
	}

}

func convertYAMLToJSON(yaml map[interface{}]interface{}) map[string]interface{} {
	strmap := recursiveConv(yaml).(map[string]interface{})
	return strmap
}

// Recursively convert all key values in generic interface{} format into strings.
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
