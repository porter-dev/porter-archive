package kubernetes_test

import (
	"testing"

	"github.com/go-test/deep"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/kubernetes"
	"github.com/porter-dev/porter/internal/kubernetes/fixtures"
	"github.com/porter-dev/porter/internal/models"
	"k8s.io/client-go/tools/clientcmd"
)

type ccsTest struct {
	name     string
	raw      []byte
	expected []*models.ClusterCandidate
}

var ClusterCandidatesTests = []ccsTest{
	{
		name: "test without cluster ca data",
		raw:  []byte(fixtures.ClusterCAWithoutData),
		expected: []*models.ClusterCandidate{
			{
				AuthMechanism: models.X509,
				ProjectID:     1,
				Resolvers: []models.ClusterResolver{
					{
						Name:     types.ClusterCAData,
						Resolved: false,
						Data:     []byte(`{"filename":"/fake/path/to/ca.pem"}`),
					},
				},
				Name:              "cluster-test",
				Server:            "https://10.10.10.10",
				ContextName:       "context-test",
				Kubeconfig:        []byte(fixtures.ClusterCAWithoutData),
				AWSClusterIDGuess: []byte{},
			},
		},
	},
	{
		name: "test cluster localhost",
		raw:  []byte(fixtures.ClusterLocalhost),
		expected: []*models.ClusterCandidate{
			{
				AuthMechanism: models.X509,
				ProjectID:     1,
				Resolvers: []models.ClusterResolver{
					{
						Name:     types.ClusterLocalhost,
						Resolved: false,
					},
				},
				Name:              "cluster-test",
				Server:            "https://localhost:30000",
				ContextName:       "context-test",
				Kubeconfig:        []byte(fixtures.ClusterLocalhost),
				AWSClusterIDGuess: []byte{},
			},
		},
	},
	{
		name: "x509 test with cert and key data",
		raw:  []byte(fixtures.X509WithData),
		expected: []*models.ClusterCandidate{
			{
				AuthMechanism:     models.X509,
				ProjectID:         1,
				Resolvers:         []models.ClusterResolver{},
				Name:              "cluster-test",
				Server:            "https://10.10.10.10",
				ContextName:       "context-test",
				Kubeconfig:        []byte(fixtures.X509WithData),
				AWSClusterIDGuess: []byte{},
			},
		},
	},
	{
		name: "x509 test without cert data",
		raw:  []byte(fixtures.X509WithoutCertData),
		expected: []*models.ClusterCandidate{
			{
				AuthMechanism: models.X509,
				ProjectID:     1,
				Resolvers: []models.ClusterResolver{
					{
						Name:     "upload-client-cert-data",
						Resolved: false,
						Data:     []byte(`{"filename":"/fake/path/to/cert.pem"}`),
					},
				},
				Name:              "cluster-test",
				Server:            "https://10.10.10.10",
				ContextName:       "context-test",
				Kubeconfig:        []byte(fixtures.X509WithoutCertData),
				AWSClusterIDGuess: []byte{},
			},
		},
	},
	{
		name: "x509 test without key data",
		raw:  []byte(fixtures.X509WithoutKeyData),
		expected: []*models.ClusterCandidate{
			{
				AuthMechanism: models.X509,
				ProjectID:     1,
				Resolvers: []models.ClusterResolver{
					{
						Name:     "upload-client-key-data",
						Resolved: false,
						Data:     []byte(`{"filename":"/fake/path/to/key.pem"}`),
					},
				},
				Name:              "cluster-test",
				Server:            "https://10.10.10.10",
				ContextName:       "context-test",
				Kubeconfig:        []byte(fixtures.X509WithoutKeyData),
				AWSClusterIDGuess: []byte{},
			},
		},
	},
	{
		name: "x509 test without cert and key data",
		raw:  []byte(fixtures.X509WithoutCertAndKeyData),
		expected: []*models.ClusterCandidate{
			{
				AuthMechanism: models.X509,
				ProjectID:     1,
				Resolvers: []models.ClusterResolver{
					{
						Name:     "upload-client-cert-data",
						Resolved: false,
						Data:     []byte(`{"filename":"/fake/path/to/cert.pem"}`),
					},
					{
						Name:     "upload-client-key-data",
						Resolved: false,
						Data:     []byte(`{"filename":"/fake/path/to/key.pem"}`),
					},
				},
				Name:              "cluster-test",
				Server:            "https://10.10.10.10",
				ContextName:       "context-test",
				Kubeconfig:        []byte(fixtures.X509WithoutCertAndKeyData),
				AWSClusterIDGuess: []byte{},
			},
		},
	},
	{
		name: "bearer token test with data",
		raw:  []byte(fixtures.BearerTokenWithData),
		expected: []*models.ClusterCandidate{
			{
				AuthMechanism:     models.Bearer,
				ProjectID:         1,
				Resolvers:         []models.ClusterResolver{},
				Name:              "cluster-test",
				Server:            "https://10.10.10.10",
				ContextName:       "context-test",
				Kubeconfig:        []byte(fixtures.BearerTokenWithData),
				AWSClusterIDGuess: []byte{},
			},
		},
	},
	{
		name: "bearer token test without data",
		raw:  []byte(fixtures.BearerTokenWithoutData),
		expected: []*models.ClusterCandidate{
			{
				AuthMechanism: models.Bearer,
				ProjectID:     1,
				Resolvers: []models.ClusterResolver{
					{
						Name:     "upload-token-data",
						Resolved: false,
						Data:     []byte(`{"filename":"/path/to/token/file.txt"}`),
					},
				},
				Name:              "cluster-test",
				Server:            "https://10.10.10.10",
				ContextName:       "context-test",
				Kubeconfig:        []byte(fixtures.BearerTokenWithoutData),
				AWSClusterIDGuess: []byte{},
			},
		},
	},
	{
		name: "gcp test",
		raw:  []byte(fixtures.GCPPlugin),
		expected: []*models.ClusterCandidate{
			{
				AuthMechanism: models.GCP,
				ProjectID:     1,
				Resolvers: []models.ClusterResolver{
					{
						Name:     "upload-gcp-key-data",
						Resolved: false,
					},
				},
				Name:              "cluster-test",
				Server:            "https://10.10.10.10",
				ContextName:       "context-test",
				Kubeconfig:        []byte(fixtures.GCPPlugin),
				AWSClusterIDGuess: []byte{},
			},
		},
	},
	{
		name: "aws iam authenticator test",
		raw:  []byte(fixtures.AWSIamAuthenticatorExec),
		expected: []*models.ClusterCandidate{
			{
				AuthMechanism: models.AWS,
				ProjectID:     1,
				Resolvers: []models.ClusterResolver{
					{
						Name:     "upload-aws-data",
						Resolved: false,
					},
				},
				Name:              "cluster-test",
				Server:            "https://10.10.10.10",
				ContextName:       "context-test",
				Kubeconfig:        []byte(fixtures.AWSIamAuthenticatorExec),
				AWSClusterIDGuess: []byte("cluster-test-aws-id-guess"),
			},
		},
	},
	{
		name: "aws eks get-token test",
		raw:  []byte(fixtures.AWSEKSGetTokenExec),
		expected: []*models.ClusterCandidate{
			{
				AuthMechanism: models.AWS,
				ProjectID:     1,
				Resolvers: []models.ClusterResolver{
					{
						Name:     "upload-aws-data",
						Resolved: false,
					},
				},
				Name:              "cluster-test",
				Server:            "https://10.10.10.10",
				ContextName:       "context-test",
				Kubeconfig:        []byte(fixtures.AWSEKSGetTokenExec),
				AWSClusterIDGuess: []byte("cluster-test-aws-id-guess"),
			},
		},
	},
	{
		name: "oidc without ca data",
		raw:  []byte(fixtures.OIDCAuthWithoutData),
		expected: []*models.ClusterCandidate{
			{
				AuthMechanism: models.OIDC,
				ProjectID:     1,
				Resolvers: []models.ClusterResolver{
					{
						Name:     "upload-oidc-idp-issuer-ca-data",
						Resolved: false,
						Data:     []byte(`{"filename":"/fake/path/to/ca.pem"}`),
					},
				},
				Name:              "cluster-test",
				Server:            "https://10.10.10.10",
				ContextName:       "context-test",
				Kubeconfig:        []byte(fixtures.OIDCAuthWithoutData),
				AWSClusterIDGuess: []byte{},
			},
		},
	},
	{
		name: "oidc with ca data",
		raw:  []byte(fixtures.OIDCAuthWithData),
		expected: []*models.ClusterCandidate{
			{
				AuthMechanism:     models.OIDC,
				ProjectID:         1,
				Resolvers:         []models.ClusterResolver{},
				Name:              "cluster-test",
				Server:            "https://10.10.10.10",
				ContextName:       "context-test",
				Kubeconfig:        []byte(fixtures.OIDCAuthWithData),
				AWSClusterIDGuess: []byte{},
			},
		},
	},
	{
		name: "basic auth test",
		raw:  []byte(fixtures.BasicAuth),
		expected: []*models.ClusterCandidate{
			{
				AuthMechanism:     models.Basic,
				ProjectID:         1,
				Resolvers:         []models.ClusterResolver{},
				Name:              "cluster-test",
				Server:            "https://10.10.10.10",
				ContextName:       "context-test",
				Kubeconfig:        []byte(fixtures.BasicAuth),
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
