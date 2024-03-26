package test

import (
	"context"
	"fmt"
	"os"
	"testing"

	"github.com/matryer/is"
	"github.com/porter-dev/api-contracts/generated/go/helpers"
	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"
	v2 "github.com/porter-dev/porter/internal/porter_app/v2"
)

func TestPatchApp(t *testing.T) {
	tests := []struct {
		haveFileName string
		wantFileName string
	}{
		{"app_proto_prepatch", "app_proto_postpatch"},
	}

	for _, tt := range tests {
		t.Run(tt.haveFileName, func(t *testing.T) {
			is := is.New(t)

			wantBytes, err := os.ReadFile(fmt.Sprintf("../testdata/%s.json", tt.wantFileName))
			is.NoErr(err) // no error expected reading test file

			want := &porterv1.PorterApp{}
			err = helpers.UnmarshalContractObject(wantBytes, want)
			is.NoErr(err) // no error expected unmarshalling test file

			inputBytes, err := os.ReadFile(fmt.Sprintf("../testdata/%s.json", tt.haveFileName))
			is.NoErr(err) // no error expected reading test file

			input := &porterv1.PorterApp{}
			err = helpers.UnmarshalContractObject(inputBytes, input)
			is.NoErr(err) // no error expected unmarshalling test file

			flags := []v2.ApplyFlag{
				v2.AttachBuildpacks{
					Buildpacks: []string{"heroku/python"},
				},
				v2.SetBuildContext{
					Context: "./app",
				},
				v2.SetBuildMethod{
					Method: "docker",
				},
				v2.SetBuildDockerfile{
					Dockerfile: "Dockerfile",
				},
				v2.SetBuilder{
					Builder: "heroku/buildpacks:20",
				},
				v2.AttachEnvGroupsFlag{
					EnvGroups: []string{"foo-group"},
				},
				v2.SetImageRepo{
					Repo: "ghcr.io/porter-dev",
				},
				v2.SetImageTag{
					Tag: "a-new-tag",
				},
				v2.SetName{
					Name: "js-test-app1",
				},
			}

			var opts []v2.PatchOperation
			for _, flag := range flags {
				opts = append(opts, flag.AsPatchOperations()...)
			}

			got, err := v2.PatchApp(context.Background(), input, opts)
			is.NoErr(err) // no error expected patching app

			diffProtoWithFailTest(t, is, want, got)
		})
	}
}
