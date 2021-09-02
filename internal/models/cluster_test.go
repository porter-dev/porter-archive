package models_test

import (
	"encoding/json"
	"testing"

	"github.com/go-test/deep"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

func TestClusterResolverExternalize(t *testing.T) {
	crData := types.ClusterResolverData{
		"filename": "/hello/there.pem",
		"key":      "value",
	}

	bytes, err := json.Marshal(crData)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	// test that the data gets unmarshalled properly
	cr := &models.ClusterResolver{
		Data: bytes,
	}

	crExternal := cr.ToClusterResolverType()

	if diff := deep.Equal(crExternal.Data, crData); diff != nil {
		t.Errorf("incorrect cluster resolver data")
		t.Error(diff)
	}
}
