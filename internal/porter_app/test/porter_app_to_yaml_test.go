package test

import (
	"context"
	"fmt"
	"os"
	"reflect"
	"testing"

	"github.com/kr/pretty"
	"github.com/matryer/is"
	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"
	"github.com/porter-dev/porter/internal/porter_app"
	v2 "github.com/porter-dev/porter/internal/porter_app/v2"
	"gopkg.in/yaml.v2"
)

func TestPorterAppToYAML(t *testing.T) {
	tests := []struct {
		porterYamlFileName string
		want               *porterv1.PorterApp
	}{
		{"v2_input_no_build_no_env", result_nobuild},
	}

	for _, tt := range tests {
		t.Run(tt.porterYamlFileName, func(t *testing.T) {
			is := is.New(t)

			originalYaml, err := os.ReadFile(fmt.Sprintf("../testdata/%s.yaml", tt.porterYamlFileName))
			is.NoErr(err) // no error expected reading test file

			porterAppProto, err := porter_app.ParseYAML(context.Background(), originalYaml, "test-app")
			is.NoErr(err) // umbrella chart values should convert to map[string]any without issues

			porterApp, err := v2.AppFromProto(porterAppProto.AppProto)
			is.NoErr(err) // app proto should be converted back to porter app representation (unmarshaled porter yaml) without issues

			diffPorterAppWithOriginalYamlTest(t, is, originalYaml, porterApp)
		})
	}
}

func diffPorterAppWithOriginalYamlTest(t *testing.T, is *is.I, wantYaml []byte, got v2.PorterApp) {
	t.Helper()

	var want map[string]interface{}
	err := yaml.Unmarshal(wantYaml, &want)
	is.NoErr(err)

	gotYaml, err := yaml.Marshal(got)
	is.NoErr(err)

	var gotMap map[string]interface{}
	err = yaml.Unmarshal(gotYaml, &gotMap)
	is.NoErr(err)

	// Compare the maps for equality
	if !reflect.DeepEqual(want, gotMap) {
		t.Errorf("Maps are not equal. Diff: %v", pretty.Diff(want, gotMap))
	}
}
