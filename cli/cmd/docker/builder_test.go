package docker

import (
	"os"
	"testing"
)

func TestLoadBuildSecrets(t *testing.T) {
	os.Clearenv()
	os.Setenv("PORTERSECRET_SECRET1", "some value")
	os.Setenv("PORTERSECRET_SECRET2", "asdf")

	expectedArgs := map[string]*string{
		"SECRET1": stringToPtr("some value"),
		"SECRET2": stringToPtr("asdf"),
	}
	
	buildArgs := make(map[string]*string)
	loadBuildSecrets(buildArgs)

	t.Logf("got arguments: %v", buildArgs)
	
	checkLoadedArgs(t, buildArgs, expectedArgs)
}

func stringToPtr(s string) *string {
	return &s
}

func checkLoadedArgs(t *testing.T, buildArgs, expectedArgs map[string]*string) {
	if len(buildArgs) != len(expectedArgs) {
		t.Fatalf("expected %d secrets to be loaded, got %d", len(expectedArgs), len(buildArgs))
	}

	for key, expectedVal := range expectedArgs {
		val, ok := buildArgs[key]
		if !ok {
			t.Fatalf("expected argument %s not present", key)
		}
		if val == nil || expectedVal == nil {
			t.Fatal("nil string received")
		}
		if *val != *expectedVal {
			t.Fatalf("got val %s for key %s, but expected %s", *val, key, *expectedVal)
		}
	}
}
