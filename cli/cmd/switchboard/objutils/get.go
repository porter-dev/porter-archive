package objutils

import "fmt"

type NestedFieldNotFoundError struct {
	Field string
}

func (e *NestedFieldNotFoundError) Error() string {
	return fmt.Sprintf("could not find field %s in configuration", e.Field)
}

// GetNestedString finds a nested string in a set of map objects. Arrays not supported.
func GetNestedString(obj map[string]interface{}, fields ...string) (string, error) {
	curr := obj
	lastIndex := len(fields) - 1

	for _, field := range fields[0:lastIndex] {
		objField, ok := curr[field]

		if !ok {
			return "", &NestedFieldNotFoundError{field}
		}

		curr, ok = objField.(map[string]interface{})

		if !ok {
			return "", fmt.Errorf("%s is not a nested object", field)
		}
	}

	// convert the last field to a string
	strFieldGeneric, ok := curr[fields[lastIndex]]

	if !ok {
		return "", &NestedFieldNotFoundError{fields[lastIndex]}
	}

	res, ok := strFieldGeneric.(string)

	if !ok {
		return "", fmt.Errorf("%s is not a string", fields[lastIndex])
	}

	return res, nil
}
