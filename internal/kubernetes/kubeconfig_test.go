package kubernetes_test

import (
	"testing"

	"github.com/go-test/deep"
	"github.com/porter-dev/porter/internal/kubernetes"
	"github.com/porter-dev/porter/internal/models"
	"k8s.io/client-go/tools/clientcmd"
)

type ccsTest struct {
	name     string
	raw      []byte
	expected []*models.ClusterCandidate
}

var ClusterCandidatesTests = []ccsTest{
	ccsTest{
		name: "test without cluster ca data",
		raw:  []byte(ClusterCAWithoutData),
		expected: []*models.ClusterCandidate{
			&models.ClusterCandidate{
				AuthMechanism: models.X509,
				ProjectID:     1,
				Resolvers: []models.ClusterResolver{
					models.ClusterResolver{
						Name:     models.ClusterCAData,
						Resolved: false,
						Data:     []byte(`{"filename":"/fake/path/to/ca.pem"}`),
					},
				},
				Name:              "cluster-test",
				Server:            "https://10.10.10.10",
				ContextName:       "context-test",
				Kubeconfig:        []byte(ClusterCAWithoutData),
				AWSClusterIDGuess: []byte{},
			},
		},
	},
	ccsTest{
		name: "test cluster localhost",
		raw:  []byte(ClusterLocalhost),
		expected: []*models.ClusterCandidate{
			&models.ClusterCandidate{
				AuthMechanism: models.X509,
				ProjectID:     1,
				Resolvers: []models.ClusterResolver{
					models.ClusterResolver{
						Name:     models.ClusterLocalhost,
						Resolved: false,
					},
				},
				Name:              "cluster-test",
				Server:            "https://localhost",
				ContextName:       "context-test",
				Kubeconfig:        []byte(ClusterLocalhost),
				AWSClusterIDGuess: []byte{},
			},
		},
	},
	ccsTest{
		name: "x509 test with cert and key data",
		raw:  []byte(x509WithData),
		expected: []*models.ClusterCandidate{
			&models.ClusterCandidate{
				AuthMechanism:     models.X509,
				ProjectID:         1,
				Resolvers:         []models.ClusterResolver{},
				Name:              "cluster-test",
				Server:            "https://10.10.10.10",
				ContextName:       "context-test",
				Kubeconfig:        []byte(x509WithData),
				AWSClusterIDGuess: []byte{},
			},
		},
	},
	ccsTest{
		name: "x509 test without cert data",
		raw:  []byte(x509WithoutCertData),
		expected: []*models.ClusterCandidate{
			&models.ClusterCandidate{
				AuthMechanism: models.X509,
				ProjectID:     1,
				Resolvers: []models.ClusterResolver{
					models.ClusterResolver{
						Name:     "upload-client-cert-data",
						Resolved: false,
						Data:     []byte(`{"filename":"/fake/path/to/cert.pem"}`),
					},
				},
				Name:              "cluster-test",
				Server:            "https://10.10.10.10",
				ContextName:       "context-test",
				Kubeconfig:        []byte(x509WithoutCertData),
				AWSClusterIDGuess: []byte{},
			},
		},
	},
	ccsTest{
		name: "x509 test without key data",
		raw:  []byte(x509WithoutKeyData),
		expected: []*models.ClusterCandidate{
			&models.ClusterCandidate{
				AuthMechanism: models.X509,
				ProjectID:     1,
				Resolvers: []models.ClusterResolver{
					models.ClusterResolver{
						Name:     "upload-client-key-data",
						Resolved: false,
						Data:     []byte(`{"filename":"/fake/path/to/key.pem"}`),
					},
				},
				Name:              "cluster-test",
				Server:            "https://10.10.10.10",
				ContextName:       "context-test",
				Kubeconfig:        []byte(x509WithoutKeyData),
				AWSClusterIDGuess: []byte{},
			},
		},
	},
	ccsTest{
		name: "x509 test without cert and key data",
		raw:  []byte(x509WithoutCertAndKeyData),
		expected: []*models.ClusterCandidate{
			&models.ClusterCandidate{
				AuthMechanism: models.X509,
				ProjectID:     1,
				Resolvers: []models.ClusterResolver{
					models.ClusterResolver{
						Name:     "upload-client-cert-data",
						Resolved: false,
						Data:     []byte(`{"filename":"/fake/path/to/cert.pem"}`),
					},
					models.ClusterResolver{
						Name:     "upload-client-key-data",
						Resolved: false,
						Data:     []byte(`{"filename":"/fake/path/to/key.pem"}`),
					},
				},
				Name:              "cluster-test",
				Server:            "https://10.10.10.10",
				ContextName:       "context-test",
				Kubeconfig:        []byte(x509WithoutCertAndKeyData),
				AWSClusterIDGuess: []byte{},
			},
		},
	},
	ccsTest{
		name: "bearer token test with data",
		raw:  []byte(BearerTokenWithData),
		expected: []*models.ClusterCandidate{
			&models.ClusterCandidate{
				AuthMechanism:     models.Bearer,
				ProjectID:         1,
				Resolvers:         []models.ClusterResolver{},
				Name:              "cluster-test",
				Server:            "https://10.10.10.10",
				ContextName:       "context-test",
				Kubeconfig:        []byte(BearerTokenWithData),
				AWSClusterIDGuess: []byte{},
			},
		},
	},
	ccsTest{
		name: "bearer token test without data",
		raw:  []byte(BearerTokenWithoutData),
		expected: []*models.ClusterCandidate{
			&models.ClusterCandidate{
				AuthMechanism: models.Bearer,
				ProjectID:     1,
				Resolvers: []models.ClusterResolver{
					models.ClusterResolver{
						Name:     "upload-token-data",
						Resolved: false,
						Data:     []byte(`{"filename":"/path/to/token/file.txt"}`),
					},
				},
				Name:              "cluster-test",
				Server:            "https://10.10.10.10",
				ContextName:       "context-test",
				Kubeconfig:        []byte(BearerTokenWithoutData),
				AWSClusterIDGuess: []byte{},
			},
		},
	},
	ccsTest{
		name: "gcp test",
		raw:  []byte(GCPPlugin),
		expected: []*models.ClusterCandidate{
			&models.ClusterCandidate{
				AuthMechanism: models.GCP,
				ProjectID:     1,
				Resolvers: []models.ClusterResolver{
					models.ClusterResolver{
						Name:     "upload-gcp-key-data",
						Resolved: false,
					},
				},
				Name:              "cluster-test",
				Server:            "https://10.10.10.10",
				ContextName:       "context-test",
				Kubeconfig:        []byte(GCPPlugin),
				AWSClusterIDGuess: []byte{},
			},
		},
	},
	ccsTest{
		name: "aws iam authenticator test",
		raw:  []byte(AWSIamAuthenticatorExec),
		expected: []*models.ClusterCandidate{
			&models.ClusterCandidate{
				AuthMechanism: models.AWS,
				ProjectID:     1,
				Resolvers: []models.ClusterResolver{
					models.ClusterResolver{
						Name:     "upload-aws-data",
						Resolved: false,
					},
				},
				Name:              "cluster-test",
				Server:            "https://10.10.10.10",
				ContextName:       "context-test",
				Kubeconfig:        []byte(AWSIamAuthenticatorExec),
				AWSClusterIDGuess: []byte("cluster-test-aws-id-guess"),
			},
		},
	},
	ccsTest{
		name: "aws eks get-token test",
		raw:  []byte(AWSEKSGetTokenExec),
		expected: []*models.ClusterCandidate{
			&models.ClusterCandidate{
				AuthMechanism: models.AWS,
				ProjectID:     1,
				Resolvers: []models.ClusterResolver{
					models.ClusterResolver{
						Name:     "upload-aws-data",
						Resolved: false,
					},
				},
				Name:              "cluster-test",
				Server:            "https://10.10.10.10",
				ContextName:       "context-test",
				Kubeconfig:        []byte(AWSEKSGetTokenExec),
				AWSClusterIDGuess: []byte("cluster-test-aws-id-guess"),
			},
		},
	},
	ccsTest{
		name: "oidc without ca data",
		raw:  []byte(OIDCAuthWithoutData),
		expected: []*models.ClusterCandidate{
			&models.ClusterCandidate{
				AuthMechanism: models.OIDC,
				ProjectID:     1,
				Resolvers: []models.ClusterResolver{
					models.ClusterResolver{
						Name:     "upload-oidc-idp-issuer-ca-data",
						Resolved: false,
						Data:     []byte(`{"filename":"/fake/path/to/ca.pem"}`),
					},
				},
				Name:              "cluster-test",
				Server:            "https://10.10.10.10",
				ContextName:       "context-test",
				Kubeconfig:        []byte(OIDCAuthWithoutData),
				AWSClusterIDGuess: []byte{},
			},
		},
	},
	ccsTest{
		name: "oidc with ca data",
		raw:  []byte(OIDCAuthWithData),
		expected: []*models.ClusterCandidate{
			&models.ClusterCandidate{
				AuthMechanism:     models.OIDC,
				ProjectID:         1,
				Resolvers:         []models.ClusterResolver{},
				Name:              "cluster-test",
				Server:            "https://10.10.10.10",
				ContextName:       "context-test",
				Kubeconfig:        []byte(OIDCAuthWithData),
				AWSClusterIDGuess: []byte{},
			},
		},
	},
	ccsTest{
		name: "basic auth test",
		raw:  []byte(BasicAuth),
		expected: []*models.ClusterCandidate{
			&models.ClusterCandidate{
				AuthMechanism:     models.Basic,
				ProjectID:         1,
				Resolvers:         []models.ClusterResolver{},
				Name:              "cluster-test",
				Server:            "https://10.10.10.10",
				ContextName:       "context-test",
				Kubeconfig:        []byte(BasicAuth),
				AWSClusterIDGuess: []byte{},
			},
		},
	},
}

func TestGetClusterCandidatesNonLocal(t *testing.T) {
	for _, c := range ClusterCandidatesTests {
		result, err := kubernetes.GetClusterCandidatesFromKubeconfig(c.raw, 1, false)

		if err != nil {
			t.Fatalf("error occurred %v\n", err)
		}

		// make result into a map so it's easier to compare
		resMap := make(map[string]*models.ClusterCandidate)

		for _, res := range result {
			resMap[res.Server+"-"+string(res.AuthMechanism)] = res
		}

		for _, exp := range c.expected {
			res, ok := resMap[exp.Server+"-"+string(exp.AuthMechanism)]

			if !ok {
				t.Fatalf("%s failed: no matching result for %s\n", c.name,
					exp.Server+"-"+string(exp.AuthMechanism))
			}

			// compare kubeconfig by transforming into a client config
			resConfig, _ := clientcmd.NewClientConfigFromBytes(res.Kubeconfig)
			expConfig, err := clientcmd.NewClientConfigFromBytes(exp.Kubeconfig)

			if err != nil {
				t.Fatalf("config from bytes, error occurred %v\n", err)
			}

			resRawConf, _ := resConfig.RawConfig()
			expRawConf, err := expConfig.RawConfig()

			if err != nil {
				t.Fatalf("raw config conversion, error occurred %v\n", err)
			}

			if diff := deep.Equal(expRawConf, resRawConf); diff != nil {
				t.Errorf("incorrect kubeconfigs")
				t.Error(diff)
			}

			// reset kubeconfigs since they won't be exactly "deep equal"
			exp.Kubeconfig = []byte{}
			res.Kubeconfig = []byte{}

			if diff := deep.Equal(exp, res); diff != nil {
				t.Errorf("incorrect cluster candidate")
				t.Error(diff)
			}
		}
	}
}

const ClusterCAWithoutData string = `
apiVersion: v1
kind: Config
clusters:
- name: cluster-test
  cluster:
    server: https://10.10.10.10
    certificate-authority: /fake/path/to/ca.pem
contexts:
- context:
    cluster: cluster-test
    user: test-admin
  name: context-test
users:
- name: test-admin
  user:
    client-certificate-data: LS0tLS1CRUdJTiBDRVJ=
    client-key-data: LS0tLS1CRUdJTiBDRVJ=
current-context: context-test
`

const ClusterLocalhost string = `
apiVersion: v1
kind: Config
clusters:
- name: cluster-test
  cluster:
    server: https://localhost
contexts:
- context:
    cluster: cluster-test
    user: test-admin
  name: context-test
users:
- name: test-admin
  user:
    client-certificate-data: LS0tLS1CRUdJTiBDRVJ=
    client-key-data: LS0tLS1CRUdJTiBDRVJ=
current-context: context-test
`

const x509WithData string = `
apiVersion: v1
kind: Config
preferences: {}
current-context: context-test
clusters:
- cluster:
    server: https://10.10.10.10
  name: cluster-test
contexts:
- context:
    cluster: cluster-test
    user: test-admin
  name: context-test
users:
- name: test-admin
  user:
    client-certificate-data: LS0tLS1CRUdJTiBDRVJ=
    client-key-data: LS0tLS1CRUdJTiBDRVJ=
`

const x509WithoutCertData string = `
apiVersion: v1
kind: Config
preferences: {}
current-context: context-test
clusters:
- cluster:
    server: https://10.10.10.10
  name: cluster-test
contexts:
- context:
    cluster: cluster-test
    user: test-admin
  name: context-test
users:
- name: test-admin
  user:
    client-certificate: /fake/path/to/cert.pem
    client-key-data: LS0tLS1CRUdJTiBDRVJ=
`

const x509WithoutKeyData string = `
apiVersion: v1
kind: Config
preferences: {}
current-context: context-test
clusters:
- cluster:
    server: https://10.10.10.10
  name: cluster-test
contexts:
- context:
    cluster: cluster-test
    user: test-admin
  name: context-test
users:
- name: test-admin
  user:
    client-certificate-data: LS0tLS1CRUdJTiBDRVJ=
    client-key: /fake/path/to/key.pem
`

const x509WithoutCertAndKeyData string = `
apiVersion: v1
kind: Config
preferences: {}
current-context: context-test
clusters:
- cluster:
    server: https://10.10.10.10
  name: cluster-test
contexts:
- context:
    cluster: cluster-test
    user: test-admin
  name: context-test
users:
- name: test-admin
  user:
    client-certificate: /fake/path/to/cert.pem
    client-key: /fake/path/to/key.pem
`

const BearerTokenWithData string = `
apiVersion: v1
kind: Config
preferences: {}
current-context: context-test
clusters:
- cluster:
    server: https://10.10.10.10
  name: cluster-test
contexts:
- context:
    cluster: cluster-test
    user: test-admin
  name: context-test
users:
- name: test-admin
  user:
    token: LS0tLS1CRUdJTiBDRVJ=
`

const BearerTokenWithoutData string = `
apiVersion: v1
kind: Config
preferences: {}
current-context: context-test
clusters:
- cluster:
    server: https://10.10.10.10
  name: cluster-test
contexts:
- context:
    cluster: cluster-test
    user: test-admin
  name: context-test
users:
- name: test-admin
  user:
    tokenFile: /path/to/token/file.txt
`
const GCPPlugin string = `
apiVersion: v1
kind: Config
clusters:
- name: cluster-test
  cluster:
    server: https://10.10.10.10
    certificate-authority-data: LS0tLS1CRUdJTiBDRVJ=
users:
- name: test-admin
  user:
    auth-provider:
      name: gcp
contexts:
- context:
    cluster: cluster-test
    user: test-admin
  name: context-test
current-context: context-test
`

const AWSIamAuthenticatorExec = `
apiVersion: v1
clusters:
- cluster:
    server: https://10.10.10.10
    certificate-authority-data: LS0tLS1CRUdJTiBDRVJ=
  name: cluster-test
contexts:
- context:
    cluster: cluster-test
    user: test-admin
  name: context-test
current-context: context-test
kind: Config
preferences: {}
users:
- name: test-admin
  user:
    exec:
      apiVersion: client.authentication.k8s.io/v1alpha1
      command: aws-iam-authenticator
      args:
        - "token"
        - "-i"
        - "cluster-test-aws-id-guess"
`

const AWSEKSGetTokenExec = `
apiVersion: v1
clusters:
- cluster:
    server: https://10.10.10.10
    certificate-authority-data: LS0tLS1CRUdJTiBDRVJ=
  name: cluster-test
contexts:
- context:
    cluster: cluster-test
    user: test-admin
  name: context-test
current-context: context-test
kind: Config
preferences: {}
users:
- name: test-admin
  user:
    exec:
      apiVersion: client.authentication.k8s.io/v1alpha1
      command: aws
      args:
        - "eks"
        - "get-token"
        - "--cluster-name"
        - "cluster-test-aws-id-guess"
`

const OIDCAuthWithoutData = `
apiVersion: v1
clusters:
- cluster:
    server: https://10.10.10.10
    certificate-authority-data: LS0tLS1CRUdJTiBDRVJ=
  name: cluster-test
contexts:
- context:
    cluster: cluster-test
    user: test-admin
  name: context-test
current-context: context-test
kind: Config
preferences: {}
users:
- name: test-admin
  user:
    auth-provider:
      config:
        client-id: porter-api
        id-token: token
        idp-issuer-url: https://10.10.10.10
        idp-certificate-authority: /fake/path/to/ca.pem
      name: oidc
`

const OIDCAuthWithData = `
apiVersion: v1
clusters:
- cluster:
    server: https://10.10.10.10
    certificate-authority-data: LS0tLS1CRUdJTiBDRVJ=
  name: cluster-test
contexts:
- context:
    cluster: cluster-test
    user: test-admin
  name: context-test
current-context: context-test
kind: Config
preferences: {}
users:
- name: test-admin
  user:
    auth-provider:
      config:
        client-id: porter-api
        id-token: token
        idp-issuer-url: https://10.10.10.10
        idp-certificate-authority-data: LS0tLS1CRUdJTiBDRVJ=
      name: oidc
`

const BasicAuth = `
apiVersion: v1
clusters:
- cluster:
    server: https://10.10.10.10
    certificate-authority-data: LS0tLS1CRUdJTiBDRVJ=
  name: cluster-test
contexts:
- context:
    cluster: cluster-test
    user: test-admin
  name: context-test
current-context: context-test
kind: Config
preferences: {}
users:
- name: test-admin
  user:
    username: admin
    password: changeme
`
