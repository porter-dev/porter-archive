package cmd_test

import (
	"testing"

	"github.com/porter-dev/porter/cli/cmd"
)

func TestMergeMapValues(t *testing.T) {
	map1 := map[string]interface{}{
		"hello": "there",
		"i":     "have",
	}

	map2 := map[string]interface{}{
		"hello": "general",
		"the":   "high",
	}

	map3 := map[string]interface{}{
		"hello":  "kenobi",
		"ground": "!",
	}

	res := cmd.MergeMapValues(map1, map2, map3)

	t.Errorf("%v\n", res)
}
