package types

import (
	"testing"
)

func TestAvailableVersion(t *testing.T) {
	if _, ok := DBVersionMapping[Engine("mongo")]; ok {
		t.Fatalf("mong engine availability should fail")
	}

	v, ok := DBVersionMapping[Engine(EnginePG)]
	if !ok {
		t.Fatalf("postgres engine not available in engine mapping")
	}

	// test for a particular version
	if !v.VersionExists(EngineVersion("9.6.23")) {
		t.Errorf("postgres 9.6.23 not available")
	}

	if v.VersionExists(EngineVersion("10.6.23")) {
		t.Errorf("postgres 10.6.23 should not available")
	}

	if EngineVersion("9.6.23").MajorVersion() != "9.6" {
		t.Errorf("wrong major version for postgres")
	}

	if EngineVersion("11.13").MajorVersion() != "11" {
		t.Errorf("wrong major version for postgres")
	}
}
