package helm_test

import (
	"bytes"
	"testing"

	"github.com/google/go-cmp/cmp"
	"github.com/porter-dev/porter/internal/helm"
)

func TestDockerSecretsPostRenderer(t *testing.T) {
	testCases := []struct {
		name   string
		input  *bytes.Buffer
		output *bytes.Buffer
	}{
		{
			name: "it appends relevant image pull secret for nested lists of resources",
			input: bytes.NewBuffer([]byte(`apiVersion: v1
kind: PodTemplateList
metadata:
  annotations:
    annotation-1: some-annotation
  name: image-secret-test
items:
- kind: PodTemplate
  template:
    spec:
      containers:
      - command:
        - sh
        - -c
        - echo 'foo'
        env:
        - name: SOME_ENV
          value: env_value
        image: example.com/bitnami/nginx:1.16.1-debian-10-r42
        name: container-name
      restartPolicy: Never
- kind: PodTemplate
  template:
    spec:
      containers:
      - command:
        - sh
        - -c
        - echo 'bar'
        env:
        - name: SOME_ENV
          value: env_value
        image: example.com/bitnami/nginx:1.16.1-debian-10-r42
        name: container-name
      restartPolicy: Never
---
kind: Unknown
other: doc
`)),
			output: bytes.NewBuffer([]byte(`apiVersion: v1
items:
- kind: PodTemplate
  template:
    spec:
      containers:
      - command:
        - sh
        - -c
        - echo 'foo'
        env:
        - name: SOME_ENV
          value: env_value
        image: example.com/bitnami/nginx:1.16.1-debian-10-r42
        name: container-name
      imagePullSecrets:
      - name: secret-1
      restartPolicy: Never
- kind: PodTemplate
  template:
    spec:
      containers:
      - command:
        - sh
        - -c
        - echo 'bar'
        env:
        - name: SOME_ENV
          value: env_value
        image: example.com/bitnami/nginx:1.16.1-debian-10-r42
        name: container-name
      imagePullSecrets:
      - name: secret-1
      restartPolicy: Never
kind: PodTemplateList
metadata:
  annotations:
    annotation-1: some-annotation
  name: image-secret-test
---
kind: Unknown
other: doc
`)),
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			r, err := helm.NewDockerSecretsPostRenderer()
			if err != nil {
				t.Fatalf("%+v", err)
			}

			renderedManifests, err := r.Run(tc.input)

			if got, want := renderedManifests.String(), tc.output.String(); !cmp.Equal(got, want) {
				t.Errorf("mismatch (-want +got):\n%s", cmp.Diff(want, got))
			}
		})
	}
}
