package test

import (
	"context"
	"fmt"
	"os"
	"testing"

	"google.golang.org/protobuf/encoding/protojson"
	"k8s.io/utils/pointer"

	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"
	"github.com/porter-dev/porter/internal/porter_app"
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

			want, err := os.ReadFile(fmt.Sprintf("../testdata/%s.yaml", tt.porterYamlFileName))
			is.NoErr(err) // no error expected reading test file

			got, err := porter_app.ParseYAML(context.Background(), want, "test-app")
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
	ServiceList: []*porterv1.Service{
		{
			Name:           "example-web",
			RunOptional:    pointer.String("node index.js"),
			Port:           8080,
			CpuCores:       0.1,
			RamMegabytes:   256,
			GpuCoresNvidia: 0,
			Gpu: &porterv1.GPU{
				Enabled:        false,
				GpuCoresNvidia: 0,
			},
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
						Enabled:             true,
						HttpPath:            "/healthz",
						Command:             "",
						InitialDelaySeconds: &initialDelaySeconds10,
						TimeoutSeconds:      5,
					},
				},
			},
			Type: 1,
		},
		{
			Name:              "example-wkr",
			RunOptional:       pointer.String("echo 'work'"),
			InstancesOptional: pointer.Int32(1),
			Port:              80,
			CpuCores:          0.1,
			RamMegabytes:      256,
			GpuCoresNvidia:    0,
			Gpu: &porterv1.GPU{
				Enabled:        false,
				GpuCoresNvidia: 0,
			},
			Config: &porterv1.Service_WorkerConfig{
				WorkerConfig: &porterv1.WorkerServiceConfig{
					Autoscaling: nil,
				},
			},
			Type: 2,
		},
		{
			Name:           "example-job",
			RunOptional:    pointer.String("echo 'hello world'"),
			CpuCores:       0.1,
			RamMegabytes:   256,
			GpuCoresNvidia: 0,
			Gpu: &porterv1.GPU{
				Enabled:        false,
				GpuCoresNvidia: 0,
			},
			Config: &porterv1.Service_JobConfig{
				JobConfig: &porterv1.JobServiceConfig{
					AllowConcurrentOptional: pointer.Bool(true),
					Cron:                    "*/10 * * * *",
					SuspendCron:             pointer.Bool(false),
					TimeoutSeconds:          60,
				},
			},
			Type: 3,
		},
	},
	Predeploy: &porterv1.Service{
		RunOptional:    pointer.String("ls"),
		Port:           0,
		CpuCores:       0,
		RamMegabytes:   0,
		GpuCoresNvidia: 0,
		Gpu: &porterv1.GPU{
			Enabled:        false,
			GpuCoresNvidia: 0,
		},
		Config: &porterv1.Service_JobConfig{},
		Type:   3,
	},
	Image: &porterv1.AppImage{
		Repository: "nginx",
		Tag:        "latest",
	},
}

var (
	trueBool  = true
	zeroInt32 = int32(0)
	oneInt32  = int32(1)
)

var v1_result_nobuild_no_image = &porterv1.PorterApp{
	Name: "test-app",
	ServiceList: []*porterv1.Service{
		{
			Name:              "example-web",
			RunOptional:       pointer.String("node index.js"),
			InstancesOptional: &zeroInt32,
			Port:              8080,
			CpuCores:          0.1,
			RamMegabytes:      256,
			GpuCoresNvidia:    0,
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
						Command:  "",
					},
					Private: pointer.Bool(false),
				},
			},
			Type: 1,
		},
		{
			Name:              "example-wkr",
			RunOptional:       pointer.String("echo 'work'"),
			InstancesOptional: &oneInt32,
			Port:              80,
			CpuCores:          0.1,
			RamMegabytes:      256,
			GpuCoresNvidia:    0,
			Config: &porterv1.Service_WorkerConfig{
				WorkerConfig: &porterv1.WorkerServiceConfig{
					Autoscaling: nil,
				},
			},
			Type: 2,
		},
		{
			Name:           "example-job",
			RunOptional:    pointer.String("echo 'hello world'"),
			CpuCores:       0.1,
			RamMegabytes:   256,
			GpuCoresNvidia: 0,
			Config: &porterv1.Service_JobConfig{
				JobConfig: &porterv1.JobServiceConfig{
					AllowConcurrentOptional: &trueBool,
					Cron:                    "*/10 * * * *",
				},
			},
			Type: 3,
		},
	},
	Predeploy: &porterv1.Service{
		RunOptional:    pointer.String("ls"),
		Instances:      0,
		Port:           0,
		CpuCores:       0,
		RamMegabytes:   0,
		GpuCoresNvidia: 0,
		Config:         &porterv1.Service_JobConfig{},
		Type:           3,
	},
}

var initialDelaySeconds10 = int32(10)

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
