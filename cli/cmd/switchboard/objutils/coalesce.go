package objutils

import "sigs.k8s.io/yaml"

// MergeYAML merges raw yaml, with preference given to override
func MergeYAML(base, override []byte) (map[string]interface{}, error) {
	baseVals := map[string]interface{}{}
	overrideVals := map[string]interface{}{}

	err := yaml.Unmarshal(base, &baseVals)

	if err != nil {
		return nil, err
	}

	err = yaml.Unmarshal(override, &overrideVals)

	if err != nil {
		return nil, err
	}

	return CoalesceValues(baseVals, overrideVals), nil
}

// CoalesceValues replaces arrays and scalar values, merges maps
func CoalesceValues(base, override map[string]interface{}) map[string]interface{} {
	if base == nil && override != nil {
		return override
	} else if override == nil {
		return base
	}

	for key, val := range base {
		if oVal, ok := override[key]; ok {
			if oVal == nil {
				delete(override, key)
			} else if isYAMLTable(oVal) && isYAMLTable(val) {
				oMapVal, _ := oVal.(map[string]interface{})
				bMapVal, _ := val.(map[string]interface{})

				override[key] = mergeMaps(bMapVal, oMapVal)
			}
		} else {
			override[key] = val
		}
	}

	return override
}

func isYAMLTable(v interface{}) bool {
	_, ok := v.(map[string]interface{})
	return ok
}

// mergeMaps merges any number of maps together, with maps later in the slice taking
// precedent
func mergeMaps(maps ...map[string]interface{}) map[string]interface{} {
	// merge bottom-up
	if len(maps) > 2 {
		mLen := len(maps)
		newMaps := maps[0 : mLen-2]

		// reduce length of maps by 1 and merge again
		newMaps = append(newMaps, mergeMaps(maps[mLen-2], maps[mLen-1]))
		return mergeMaps(newMaps...)
	} else if len(maps) == 2 {
		if maps[0] == nil {
			return maps[1]
		}

		if maps[1] == nil {
			return maps[0]
		}

		for key, map0Val := range maps[0] {
			if map1Val, ok := maps[1][key]; ok && map1Val == nil {
				delete(maps[1], key)
			} else if !ok {
				maps[1][key] = map0Val
			} else if isYAMLTable(map0Val) {
				if isYAMLTable(map1Val) {
					mergeMaps(map0Val.(map[string]interface{}), map1Val.(map[string]interface{}))
				}
			}
		}

		return maps[1]
	} else if len(maps) == 1 {
		return maps[0]
	}

	return nil
}
