package porter_app

import (
	"context"
	"fmt"
	"os"
	"testing"

	"google.golang.org/protobuf/encoding/protojson"
	"k8s.io/utils/pointer"

	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"
	"github.com/sergi/go-diff/diffmatchpatch"

	"github.com/matryer/is"
)

func TestParseYAML(t *testing.T) {
	tests := []struct {
		porterYamlFileName string
		want               *porterv1.PorterApp
	}{
		{"v2_input_nobuild", result_nobuild},
		{"v1_input_no_build_no_image", v1_result_nobuild_no_image},
	}

	for _, tt := range tests {
		t.Run(tt.porterYamlFileName, func(t *testing.T) {
			is := is.New(t)

			want, err := os.ReadFile(fmt.Sprintf("testdata/%s.yaml", tt.porterYamlFileName))
			is.NoErr(err) // no error expected reading test file

			got, err := ParseYAML(context.Background(), want, "test-app")
			is.NoErr(err) // umbrella chart values should convert to map[string]any without issues

			diffProtoWithFailTest(t, is, tt.want, got.AppProto)

			is.Equal(got.EnvVariables, map[string]string{
				"PORT":     "8080",
				"NODE_ENV": "production",
			})
		})
	}
}

var result_nobuild = &porterv1.PorterApp{
	Name: "test-app",
	Services: map[string]*porterv1.Service{
		"example-job": {
			Run:          "echo 'hello world'",
			CpuCores:     0.1,
			RamMegabytes: 256,
			Config: &porterv1.Service_JobConfig{
				JobConfig: &porterv1.JobServiceConfig{
					AllowConcurrent: true,
					Cron:            "*/10 * * * *",
				},
			},
			Type: 3,
		},
		"example-wkr": {
			Run:          "echo 'work'",
			Instances:    1,
			Port:         80,
			CpuCores:     0.1,
			RamMegabytes: 256,
			Config: &porterv1.Service_WorkerConfig{
				WorkerConfig: &porterv1.WorkerServiceConfig{
					Autoscaling: nil,
				},
			},
			Type: 2,
		},
		"example-web": {
			Run:          "node index.js",
			Instances:    0,
			Port:         8080,
			CpuCores:     0.1,
			RamMegabytes: 256,
			Config: &porterv1.Service_WebConfig{
				WebConfig: &porterv1.WebServiceConfig{
					Autoscaling: &porterv1.Autoscaling{
						Enabled:                true,
						MinInstances:           1,
						MaxInstances:           3,
						CpuThresholdPercent:    60,
						MemoryThresholdPercent: 60,
					},
					Domains: []*porterv1.Domain{
						{
							Name: "test1.example.com",
						},
						{
							Name: "test2.example.com",
						},
					},
					HealthCheck: &porterv1.HealthCheck{
						Enabled:  true,
						HttpPath: "/healthz",
					},
				},
			},
			Type: 1,
		},
	},
	Predeploy: &porterv1.Service{
		Run:          "ls",
		Instances:    0,
		Port:         0,
		CpuCores:     0,
		RamMegabytes: 0,
		Config:       &porterv1.Service_JobConfig{},
		Type:         3,
	},
	Image: &porterv1.AppImage{
		Repository: "nginx",
		Tag:        "latest",
	},
}

var v1_result_nobuild_no_image = &porterv1.PorterApp{
	Name: "test-app",
	Services: map[string]*porterv1.Service{
		"example-job": {
			Run:          "echo 'hello world'",
			CpuCores:     0.1,
			RamMegabytes: 256,
			Config: &porterv1.Service_JobConfig{
				JobConfig: &porterv1.JobServiceConfig{
					AllowConcurrent: true,
					Cron:            "*/10 * * * *",
				},
			},
			Type: 3,
		},
		"example-wkr": {
			Run:          "echo 'work'",
			Instances:    1,
			Port:         80,
			CpuCores:     0.1,
			RamMegabytes: 256,
			Config: &porterv1.Service_WorkerConfig{
				WorkerConfig: &porterv1.WorkerServiceConfig{
					Autoscaling: nil,
				},
			},
			Type: 2,
		},
		"example-web": {
			Run:          "node index.js",
			Instances:    0,
			Port:         8080,
			CpuCores:     0.1,
			RamMegabytes: 256,
			Config: &porterv1.Service_WebConfig{
				WebConfig: &porterv1.WebServiceConfig{
					Autoscaling: &porterv1.Autoscaling{
						Enabled:                true,
						MinInstances:           1,
						MaxInstances:           3,
						CpuThresholdPercent:    60,
						MemoryThresholdPercent: 60,
					},
					Domains: []*porterv1.Domain{
						{
							Name: "test1.example.com",
						},
						{
							Name: "test2.example.com",
						},
					},
					HealthCheck: &porterv1.HealthCheck{
						Enabled:  true,
						HttpPath: "/healthz",
					},
					Private: pointer.Bool(false),
				},
			},
			Type: 1,
		},
	},
	Predeploy: &porterv1.Service{
		Run:          "ls",
		Instances:    0,
		Port:         0,
		CpuCores:     0,
		RamMegabytes: 0,
		Config:       &porterv1.Service_JobConfig{},
		Type:         3,
	},
}

func diffProtoWithFailTest(t *testing.T, is *is.I, want, got *porterv1.PorterApp) {
	t.Helper()

	opts := protojson.MarshalOptions{Multiline: true}

	wantJson, err := opts.Marshal(want)
	is.NoErr(err) // no error expected marshalling want

	gotJson, err := opts.Marshal(got)
	is.NoErr(err) // no error expected marshalling got

	if string(wantJson) != string(gotJson) {
		dmp := diffmatchpatch.New()
		diffs := dmp.DiffMain(string(wantJson), string(gotJson), false)

		t.Errorf("diff between want and got: %s", dmp.DiffPrettyText(diffs))
	}
}
