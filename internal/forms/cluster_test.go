package forms_test

import (
	"testing"

	"github.com/go-test/deep"
	"github.com/porter-dev/porter/internal/forms"
	"github.com/porter-dev/porter/internal/kubernetes/fixtures"
	"github.com/porter-dev/porter/internal/models"
	"gorm.io/gorm"
	"k8s.io/client-go/tools/clientcmd"

	ints "github.com/porter-dev/porter/internal/models/integrations"
)

type clusterTest struct {
	name    string
	raw     string
	isLocal bool

	resolver       *models.ClusterResolverAll
	expIntegration interface{}
	expCluster     *models.Cluster
}

var ClusterTests = []clusterTest{
	clusterTest{
		name:     "local test should preserve kubeconfig",
		raw:      fixtures.ClusterCAWithData,
		isLocal:  true,
		resolver: &models.ClusterResolverAll{},
		expIntegration: &ints.KubeIntegration{
			Mechanism:  ints.KubeLocal,
			UserID:     1,
			ProjectID:  1,
			Kubeconfig: []byte(fixtures.ClusterCAWithData),
		},
		expCluster: &models.Cluster{
			AuthMechanism:            models.Local,
			ProjectID:                1,
			Name:                     "cluster-test",
			Server:                   "https://10.10.10.10",
			KubeIntegrationID:        1,
			CertificateAuthorityData: []byte("-----BEGIN CER"),
		},
	},
	clusterTest{
		name:     "cluster with data",
		raw:      fixtures.ClusterCAWithData,
		isLocal:  false,
		resolver: &models.ClusterResolverAll{},
		expIntegration: &ints.KubeIntegration{
			Mechanism:             ints.KubeX509,
			UserID:                1,
			ProjectID:             1,
			ClientCertificateData: []byte("-----BEGIN CER"),
			ClientKeyData:         []byte("-----BEGIN CER"),
		},
		expCluster: &models.Cluster{
			AuthMechanism:            models.X509,
			ProjectID:                1,
			Name:                     "cluster-test",
			Server:                   "https://10.10.10.10",
			KubeIntegrationID:        2,
			CertificateAuthorityData: []byte("-----BEGIN CER"),
		},
	},
	clusterTest{
		name:    "cluster without data",
		raw:     fixtures.ClusterCAWithoutData,
		isLocal: false,
		resolver: &models.ClusterResolverAll{
			ClusterCAData: "LS0tLS1CRUdJTiBDRVJ=",
		},
		expIntegration: &ints.KubeIntegration{
			Mechanism:             ints.KubeX509,
			UserID:                1,
			ProjectID:             1,
			ClientCertificateData: []byte("-----BEGIN CER"),
			ClientKeyData:         []byte("-----BEGIN CER"),
		},
		expCluster: &models.Cluster{
			AuthMechanism:            models.X509,
			ProjectID:                1,
			Name:                     "cluster-test",
			Server:                   "https://10.10.10.10",
			KubeIntegrationID:        3,
			CertificateAuthorityData: []byte("-----BEGIN CER"),
		},
	},
	clusterTest{
		name:    "cluster localhost",
		raw:     fixtures.ClusterLocalhost,
		isLocal: false,
		resolver: &models.ClusterResolverAll{
			ClusterHostname: "example.com",
		},
		expIntegration: &ints.KubeIntegration{
			Mechanism:             ints.KubeX509,
			UserID:                1,
			ProjectID:             1,
			ClientCertificateData: []byte("-----BEGIN CER"),
			ClientKeyData:         []byte("-----BEGIN CER"),
		},
		expCluster: &models.Cluster{
			AuthMechanism:     models.X509,
			ProjectID:         1,
			Name:              "cluster-test",
			Server:            "https://example.com:30000",
			KubeIntegrationID: 4,
		},
	},
	clusterTest{
		name:     "x509 cert and key data",
		raw:      fixtures.X509WithData,
		isLocal:  false,
		resolver: &models.ClusterResolverAll{},
		expIntegration: &ints.KubeIntegration{
			Mechanism:             ints.KubeX509,
			UserID:                1,
			ProjectID:             1,
			ClientCertificateData: []byte("-----BEGIN CER"),
			ClientKeyData:         []byte("-----BEGIN CER"),
		},
		expCluster: &models.Cluster{
			AuthMechanism:     models.X509,
			ProjectID:         1,
			Name:              "cluster-test",
			Server:            "https://10.10.10.10",
			KubeIntegrationID: 5,
		},
	},
	clusterTest{
		name:    "x509 no cert data",
		raw:     fixtures.X509WithoutCertData,
		isLocal: false,
		resolver: &models.ClusterResolverAll{
			ClientCertData: "LS0tLS1CRUdJTiBDRVJ=",
		},
		expIntegration: &ints.KubeIntegration{
			Mechanism:             ints.KubeX509,
			UserID:                1,
			ProjectID:             1,
			ClientCertificateData: []byte("-----BEGIN CER"),
			ClientKeyData:         []byte("-----BEGIN CER"),
		},
		expCluster: &models.Cluster{
			AuthMechanism:     models.X509,
			ProjectID:         1,
			Name:              "cluster-test",
			Server:            "https://10.10.10.10",
			KubeIntegrationID: 6,
		},
	},
	clusterTest{
		name:    "x509 no key data",
		raw:     fixtures.X509WithoutKeyData,
		isLocal: false,
		resolver: &models.ClusterResolverAll{
			ClientKeyData: "LS0tLS1CRUdJTiBDRVJ=",
		},
		expIntegration: &ints.KubeIntegration{
			Mechanism:             ints.KubeX509,
			UserID:                1,
			ProjectID:             1,
			ClientCertificateData: []byte("-----BEGIN CER"),
			ClientKeyData:         []byte("-----BEGIN CER"),
		},
		expCluster: &models.Cluster{
			AuthMechanism:     models.X509,
			ProjectID:         1,
			Name:              "cluster-test",
			Server:            "https://10.10.10.10",
			KubeIntegrationID: 7,
		},
	},
	clusterTest{
		name:    "x509 no cert and key data",
		raw:     fixtures.X509WithoutCertAndKeyData,
		isLocal: false,
		resolver: &models.ClusterResolverAll{
			ClientCertData: "LS0tLS1CRUdJTiBDRVJ=",
			ClientKeyData:  "LS0tLS1CRUdJTiBDRVJ=",
		},
		expIntegration: &ints.KubeIntegration{
			Mechanism:             ints.KubeX509,
			UserID:                1,
			ProjectID:             1,
			ClientCertificateData: []byte("-----BEGIN CER"),
			ClientKeyData:         []byte("-----BEGIN CER"),
		},
		expCluster: &models.Cluster{
			AuthMechanism:     models.X509,
			ProjectID:         1,
			Name:              "cluster-test",
			Server:            "https://10.10.10.10",
			KubeIntegrationID: 8,
		},
	},
	clusterTest{
		name:     "bearer token with data",
		raw:      fixtures.BearerTokenWithData,
		isLocal:  false,
		resolver: &models.ClusterResolverAll{},
		expIntegration: &ints.KubeIntegration{
			Mechanism: ints.KubeBearer,
			UserID:    1,
			ProjectID: 1,
			Token:     []byte("LS0tLS1CRUdJTiBDRVJ="),
		},
		expCluster: &models.Cluster{
			AuthMechanism:     models.Bearer,
			ProjectID:         1,
			Name:              "cluster-test",
			Server:            "https://10.10.10.10",
			KubeIntegrationID: 9,
		},
	},
	clusterTest{
		name:    "bearer token without data",
		raw:     fixtures.BearerTokenWithoutData,
		isLocal: false,
		resolver: &models.ClusterResolverAll{
			TokenData: "tokentoken",
		},
		expIntegration: &ints.KubeIntegration{
			Mechanism: ints.KubeBearer,
			UserID:    1,
			ProjectID: 1,
			Token:     []byte("tokentoken"),
		},
		expCluster: &models.Cluster{
			AuthMechanism:     models.Bearer,
			ProjectID:         1,
			Name:              "cluster-test",
			Server:            "https://10.10.10.10",
			KubeIntegrationID: 10,
		},
	},
	clusterTest{
		name:     "basic auth",
		raw:      fixtures.BasicAuth,
		isLocal:  false,
		resolver: &models.ClusterResolverAll{},
		expIntegration: &ints.KubeIntegration{
			Mechanism: ints.KubeBasic,
			UserID:    1,
			ProjectID: 1,
			Username:  []byte("admin"),
			Password:  []byte("changeme"),
		},
		expCluster: &models.Cluster{
			AuthMechanism:            models.Basic,
			ProjectID:                1,
			Name:                     "cluster-test",
			Server:                   "https://10.10.10.10",
			KubeIntegrationID:        11,
			CertificateAuthorityData: []byte("-----BEGIN CER"),
		},
	},
	clusterTest{
		name:    "gcp plugin",
		raw:     fixtures.GCPPlugin,
		isLocal: false,
		resolver: &models.ClusterResolverAll{
			GCPKeyData: `{"key":"data"}`,
		},
		expIntegration: &ints.GCPIntegration{
			UserID:     1,
			ProjectID:  1,
			GCPKeyData: []byte(`{"key":"data"}`),
		},
		expCluster: &models.Cluster{
			AuthMechanism:            models.GCP,
			ProjectID:                1,
			Name:                     "cluster-test",
			Server:                   "https://10.10.10.10",
			GCPIntegrationID:         1,
			CertificateAuthorityData: []byte("-----BEGIN CER"),
		},
	},
	clusterTest{
		name:    "aws iam authenticator",
		raw:     fixtures.AWSIamAuthenticatorExec,
		isLocal: false,
		resolver: &models.ClusterResolverAll{
			AWSAccessKeyID:     "accesskey",
			AWSClusterID:       "cluster-test-aws-id-guess",
			AWSSecretAccessKey: "secret",
		},
		expIntegration: &ints.AWSIntegration{
			UserID:             1,
			ProjectID:          1,
			AWSAccessKeyID:     []byte("accesskey"),
			AWSClusterID:       []byte("cluster-test-aws-id-guess"),
			AWSSecretAccessKey: []byte("secret"),
		},
		expCluster: &models.Cluster{
			AuthMechanism:            models.AWS,
			ProjectID:                1,
			Name:                     "cluster-test",
			Server:                   "https://10.10.10.10",
			AWSIntegrationID:         1,
			CertificateAuthorityData: []byte("-----BEGIN CER"),
		},
	},
	clusterTest{
		name:    "aws eks get token",
		raw:     fixtures.AWSEKSGetTokenExec,
		isLocal: false,
		resolver: &models.ClusterResolverAll{
			AWSAccessKeyID:     "accesskey",
			AWSClusterID:       "cluster-test-aws-id-guess",
			AWSSecretAccessKey: "secret",
		},
		expIntegration: &ints.AWSIntegration{
			UserID:             1,
			ProjectID:          1,
			AWSAccessKeyID:     []byte("accesskey"),
			AWSClusterID:       []byte("cluster-test-aws-id-guess"),
			AWSSecretAccessKey: []byte("secret"),
		},
		expCluster: &models.Cluster{
			AuthMechanism:            models.AWS,
			ProjectID:                1,
			Name:                     "cluster-test",
			Server:                   "https://10.10.10.10",
			AWSIntegrationID:         2,
			CertificateAuthorityData: []byte("-----BEGIN CER"),
		},
	},
	clusterTest{
		name:    "oidc without idp issuer data",
		raw:     fixtures.OIDCAuthWithoutData,
		isLocal: false,
		resolver: &models.ClusterResolverAll{
			OIDCIssuerCAData: "LS0tLS1CRUdJTiBDRVJ=",
		},
		expIntegration: &ints.OIDCIntegration{
			Client:                   ints.OIDCKube,
			UserID:                   1,
			ProjectID:                1,
			IssuerURL:                []byte("https://10.10.10.10"),
			ClientID:                 []byte("porter-api"),
			CertificateAuthorityData: []byte("LS0tLS1CRUdJTiBDRVJ="),
			IDToken:                  []byte("token"),
		},
		expCluster: &models.Cluster{
			AuthMechanism:            models.OIDC,
			ProjectID:                1,
			Name:                     "cluster-test",
			Server:                   "https://10.10.10.10",
			OIDCIntegrationID:        1,
			CertificateAuthorityData: []byte("-----BEGIN CER"),
		},
	},
	clusterTest{
		name:     "oidc with idp issuer data",
		raw:      fixtures.OIDCAuthWithData,
		isLocal:  false,
		resolver: &models.ClusterResolverAll{},
		expIntegration: &ints.OIDCIntegration{
			Client:                   ints.OIDCKube,
			UserID:                   1,
			ProjectID:                1,
			IssuerURL:                []byte("https://10.10.10.10"),
			ClientID:                 []byte("porter-api"),
			CertificateAuthorityData: []byte("LS0tLS1CRUdJTiBDRVJ="),
			IDToken:                  []byte("token"),
		},
		expCluster: &models.Cluster{
			AuthMechanism:            models.OIDC,
			ProjectID:                1,
			Name:                     "cluster-test",
			Server:                   "https://10.10.10.10",
			OIDCIntegrationID:        2,
			CertificateAuthorityData: []byte("-----BEGIN CER"),
		},
	},
}

func TestClusters(t *testing.T) {
	tester := &tester{
		dbFileName: "./cluster_test.db",
	}

	setupTestEnv(tester, t)
	initUser(tester, t)
	initProject(tester, t)
	defer cleanup(tester, t)

	for _, c := range ClusterTests {
		// create cluster candidate
		ccForm := &forms.CreateClusterCandidatesForm{
			ProjectID:  tester.initProjects[0].ID,
			Kubeconfig: c.raw,
			IsLocal:    c.isLocal,
		}

		ccs, err := ccForm.ToClusterCandidates(c.isLocal)

		if err != nil {
			t.Fatalf("%v\n", err)
		}

		var cc *models.ClusterCandidate

		for _, _cc := range ccs {
			cc, err = tester.repo.Cluster.CreateClusterCandidate(_cc)

			if err != nil {
				t.Fatalf("%v\n", err)
			}

			cc, err = tester.repo.Cluster.ReadClusterCandidate(cc.ID)

			if err != nil {
				t.Fatalf("%v\n", err)
			}
		}

		form := &forms.ResolveClusterForm{
			Resolver:           c.resolver,
			ClusterCandidateID: cc.ID,
			ProjectID:          tester.initProjects[0].ID,
			UserID:             tester.initUsers[0].ID,
		}

		// resolve integration (should be kube with local)
		err = form.ResolveIntegration(*tester.repo)

		if err != nil {
			t.Fatalf("%v\n", err)
		}

		switch c.expIntegration.(type) {
		case *ints.KubeIntegration:
			// make sure integration is equal, read integration from DB
			gotIntegration, err := tester.repo.KubeIntegration.ReadKubeIntegration(form.IntegrationID)

			if err != nil {
				t.Fatalf("%v\n", err)
			}

			// reset got integration model
			gotIntegration.Model = gorm.Model{}

			ki, _ := c.expIntegration.(*ints.KubeIntegration)

			// if kubeconfig, compare
			if len(ki.Kubeconfig) > 0 {
				compareKubeconfig(t, gotIntegration.Kubeconfig, ki.Kubeconfig)

				// reset kubeconfig fields for deep.Equal
				gotIntegration.Kubeconfig = []byte{}
				ki.Kubeconfig = []byte{}
			}

			if diff := deep.Equal(ki, gotIntegration); diff != nil {
				t.Errorf("incorrect kube integration")
				t.Error(diff)
			}
		case *ints.OIDCIntegration:
			// make sure integration is equal, read integration from DB
			gotIntegration, err := tester.repo.OIDCIntegration.ReadOIDCIntegration(form.IntegrationID)

			if err != nil {
				t.Fatalf("%v\n", err)
			}

			// reset got integration model
			gotIntegration.Model = gorm.Model{}

			oidc, _ := c.expIntegration.(*ints.OIDCIntegration)

			if diff := deep.Equal(oidc, gotIntegration); diff != nil {
				t.Errorf("incorrect oidc integration")
				t.Error(diff)
			}
		case *ints.GCPIntegration:
			// make sure integration is equal, read integration from DB
			gotIntegration, err := tester.repo.GCPIntegration.ReadGCPIntegration(form.IntegrationID)

			if err != nil {
				t.Fatalf("%v\n", err)
			}

			// reset got integration model
			gotIntegration.Model = gorm.Model{}

			gcp, _ := c.expIntegration.(*ints.GCPIntegration)

			if diff := deep.Equal(gcp, gotIntegration); diff != nil {
				t.Errorf("incorrect gcp integration")
				t.Error(diff)
			}
		case *ints.AWSIntegration:
			// make sure integration is equal, read integration from DB
			gotIntegration, err := tester.repo.AWSIntegration.ReadAWSIntegration(form.IntegrationID)

			if err != nil {
				t.Fatalf("%v\n", err)
			}

			// reset got integration model
			gotIntegration.Model = gorm.Model{}

			aws, _ := c.expIntegration.(*ints.AWSIntegration)

			if diff := deep.Equal(aws, gotIntegration); diff != nil {
				t.Errorf("incorrect aws integration")
				t.Error(diff)
			}
		}

		// resolve cluster
		gotCluster, err := form.ResolveCluster(*tester.repo)

		if err != nil {
			t.Fatalf("%v\n", err)
		}

		gotCluster.Model = gorm.Model{}

		if diff := deep.Equal(c.expCluster, gotCluster); diff != nil {
			t.Errorf("incorrect cluster")
			t.Error(diff)
		}
	}
}

func compareKubeconfig(t *testing.T, resKube []byte, expKube []byte) {
	// compare kubeconfig by transforming into a client config
	resConfig, _ := clientcmd.NewClientConfigFromBytes(resKube)
	expConfig, err := clientcmd.NewClientConfigFromBytes(expKube)

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
}

// func TestPopulateServiceAccountClusterDataAction(t *testing.T) {
// 	// create the in-memory repository
// 	repo := test.NewRepository(true)

// 	// create a new project
// 	repo.Project.CreateProject(&models.Project{
// 		Name: "test-project",
// 	})

// 	// create a ServiceAccountCandidate from a kubeconfig
// 	saCandidates, err := kubernetes.GetServiceAccountCandidates([]byte(ClusterCAWithoutData), false)

// 	if err != nil {
// 		t.Fatalf("%v\n", err)
// 	}

// 	for _, saCandidate := range saCandidates {
// 		repo.ServiceAccount.CreateServiceAccountCandidate(saCandidate)
// 	}

// 	// create a new form
// 	form := forms.ClusterCADataAction{
// 		ServiceAccountActionResolver: &forms.ServiceAccountActionResolver{
// 			ServiceAccountCandidateID: 1,
// 		},
// 		ClusterCAData: "LS0tLS1CRUdJTiBDRVJ=",
// 	}

// 	err = form.PopulateServiceAccount(repo.ServiceAccount)

// 	if err != nil {
// 		t.Fatalf("%v\n", err)
// 	}

// 	sa, err := repo.ServiceAccount.CreateServiceAccount(form.ServiceAccountActionResolver.SA)
// 	decodedStr, _ := base64.StdEncoding.DecodeString("LS0tLS1CRUdJTiBDRVJ=")

// 	if len(sa.Clusters) != 1 {
// 		t.Fatalf("cluster not written\n")
// 	}

// 	if sa.Clusters[0].ServiceAccountID != 1 {
// 		t.Errorf("service account ID of joined cluster is not 1")
// 	}

// 	if string(sa.Clusters[0].CertificateAuthorityData) != string(decodedStr) {
// 		t.Errorf("cluster ca data and input do not match: expected %s, got %s\n",
// 			string(sa.Clusters[0].CertificateAuthorityData), string(decodedStr))
// 	}

// 	if sa.Integration != "x509" {
// 		t.Errorf("service account auth mechanism is not x509")
// 	}

// 	if string(sa.ClientCertificateData) != string(decodedStr) {
// 		t.Errorf("service account cert data and input do not match: expected %s, got %s\n",
// 			string(sa.ClientCertificateData), string(decodedStr))
// 	}

// 	if string(sa.ClientKeyData) != string(decodedStr) {
// 		t.Errorf("service account key data and input do not match: expected %s, got %s\n",
// 			string(sa.ClientKeyData), string(decodedStr))
// 	}
// }

// func TestPopulateServiceAccountClusterLocalhostAction(t *testing.T) {
// 	// create the in-memory repository
// 	repo := test.NewRepository(true)

// 	// create a new project
// 	repo.Project.CreateProject(&models.Project{
// 		Name: "test-project",
// 	})

// 	// create a ServiceAccountCandidate from a kubeconfig
// 	saCandidates, err := kubernetes.GetServiceAccountCandidates([]byte(ClusterLocalhost), false)

// 	if err != nil {
// 		t.Fatalf("%v\n", err)
// 	}

// 	for _, saCandidate := range saCandidates {
// 		repo.ServiceAccount.CreateServiceAccountCandidate(saCandidate)
// 	}

// 	// create a new form
// 	form := forms.ClusterLocalhostAction{
// 		ServiceAccountActionResolver: &forms.ServiceAccountActionResolver{
// 			ServiceAccountCandidateID: 1,
// 		},
// 		ClusterHostname: "host.docker.internal",
// 	}

// 	err = form.PopulateServiceAccount(repo.ServiceAccount)

// 	if err != nil {
// 		t.Fatalf("%v\n", err)
// 	}

// 	sa, err := repo.ServiceAccount.CreateServiceAccount(form.ServiceAccountActionResolver.SA)
// 	decodedStr, _ := base64.StdEncoding.DecodeString("LS0tLS1CRUdJTiBDRVJ=")

// 	if len(sa.Clusters) != 1 {
// 		t.Fatalf("cluster not written\n")
// 	}

// 	if sa.Clusters[0].ServiceAccountID != 1 {
// 		t.Errorf("service account ID of joined cluster is not 1")
// 	}

// 	if sa.Clusters[0].Server != "https://host.docker.internal:30000" {
// 		t.Errorf("service account cluster server is incorrect: expected %s, got %s\n",
// 			"https://host.docker.internal:30000", sa.Clusters[0].Server)
// 	}

// 	if sa.Integration != "x509" {
// 		t.Errorf("service account auth mechanism is not x509")
// 	}

// 	if string(sa.ClientCertificateData) != string(decodedStr) {
// 		t.Errorf("service account cert data and input do not match: expected %s, got %s\n",
// 			string(sa.ClientCertificateData), string(decodedStr))
// 	}

// 	if string(sa.ClientKeyData) != string(decodedStr) {
// 		t.Errorf("service account key data and input do not match: expected %s, got %s\n",
// 			string(sa.ClientKeyData), string(decodedStr))
// 	}
// }

// func TestPopulateServiceAccountClientCertAction(t *testing.T) {
// 	// create the in-memory repository
// 	repo := test.NewRepository(true)

// 	// create a new project
// 	repo.Project.CreateProject(&models.Project{
// 		Name: "test-project",
// 	})

// 	// create a ServiceAccountCandidate from a kubeconfig
// 	saCandidates, err := kubernetes.GetServiceAccountCandidates([]byte(ClientWithoutCertData), false)

// 	if err != nil {
// 		t.Fatalf("%v\n", err)
// 	}

// 	for _, saCandidate := range saCandidates {
// 		repo.ServiceAccount.CreateServiceAccountCandidate(saCandidate)
// 	}

// 	// create a new form
// 	form := forms.ClientCertDataAction{
// 		ServiceAccountActionResolver: &forms.ServiceAccountActionResolver{
// 			ServiceAccountCandidateID: 1,
// 		},
// 		ClientCertData: "LS0tLS1CRUdJTiBDRVJ=",
// 	}

// 	err = form.PopulateServiceAccount(repo.ServiceAccount)

// 	if err != nil {
// 		t.Fatalf("%v\n", err)
// 	}

// 	sa, err := repo.ServiceAccount.CreateServiceAccount(form.ServiceAccountActionResolver.SA)
// 	decodedStr, _ := base64.StdEncoding.DecodeString("LS0tLS1CRUdJTiBDRVJ=")

// 	if len(sa.Clusters) != 1 {
// 		t.Fatalf("cluster not written\n")
// 	}

// 	if sa.Clusters[0].ServiceAccountID != 1 {
// 		t.Errorf("service account ID of joined cluster is not 1")
// 	}

// 	if string(sa.Clusters[0].CertificateAuthorityData) != string(decodedStr) {
// 		t.Errorf("cluster ca data and input do not match: expected %s, got %s\n",
// 			string(sa.Clusters[0].CertificateAuthorityData), string(decodedStr))
// 	}

// 	if sa.Integration != "x509" {
// 		t.Errorf("service account auth mechanism is not x509")
// 	}

// 	if string(sa.ClientCertificateData) != string(decodedStr) {
// 		t.Errorf("service account cert data and input do not match: expected %s, got %s\n",
// 			string(sa.ClientCertificateData), string(decodedStr))
// 	}

// 	if string(sa.ClientKeyData) != string(decodedStr) {
// 		t.Errorf("service account key data and input do not match: expected %s, got %s\n",
// 			string(sa.ClientKeyData), string(decodedStr))
// 	}
// }

// func TestPopulateServiceAccountClientCertAndKeyActions(t *testing.T) {
// 	// create the in-memory repository
// 	repo := test.NewRepository(true)

// 	// create a new project
// 	repo.Project.CreateProject(&models.Project{
// 		Name: "test-project",
// 	})

// 	// create a ServiceAccountCandidate from a kubeconfig
// 	saCandidates, err := kubernetes.GetServiceAccountCandidates([]byte(ClientWithoutCertAndKeyData), false)

// 	if err != nil {
// 		t.Fatalf("%v\n", err)
// 	}

// 	for _, saCandidate := range saCandidates {
// 		repo.ServiceAccount.CreateServiceAccountCandidate(saCandidate)
// 	}

// 	// create a new form
// 	form := forms.ClientCertDataAction{
// 		ServiceAccountActionResolver: &forms.ServiceAccountActionResolver{
// 			ServiceAccountCandidateID: 1,
// 		},
// 		ClientCertData: "LS0tLS1CRUdJTiBDRVJ=",
// 	}

// 	err = form.PopulateServiceAccount(repo.ServiceAccount)

// 	if err != nil {
// 		t.Fatalf("%v\n", err)
// 	}

// 	keyForm := forms.ClientKeyDataAction{
// 		ServiceAccountActionResolver: form.ServiceAccountActionResolver,
// 		ClientKeyData:                "LS0tLS1CRUdJTiBDRVJ=",
// 	}

// 	err = keyForm.PopulateServiceAccount(repo.ServiceAccount)

// 	if err != nil {
// 		t.Fatalf("%v\n", err)
// 	}

// 	sa, err := repo.ServiceAccount.CreateServiceAccount(keyForm.ServiceAccountActionResolver.SA)
// 	decodedStr, _ := base64.StdEncoding.DecodeString("LS0tLS1CRUdJTiBDRVJ=")

// 	if len(sa.Clusters) != 1 {
// 		t.Fatalf("cluster not written\n")
// 	}

// 	if sa.Clusters[0].ServiceAccountID != 1 {
// 		t.Errorf("service account ID of joined cluster is not 1")
// 	}

// 	if string(sa.Clusters[0].CertificateAuthorityData) != string(decodedStr) {
// 		t.Errorf("cluster ca data and input do not match: expected %s, got %s\n",
// 			string(sa.Clusters[0].CertificateAuthorityData), string(decodedStr))
// 	}

// 	if sa.Integration != "x509" {
// 		t.Errorf("service account auth mechanism is not x509")
// 	}

// 	if string(sa.ClientCertificateData) != string(decodedStr) {
// 		t.Errorf("service account cert data and input do not match: expected %s, got %s\n",
// 			string(sa.ClientCertificateData), string(decodedStr))
// 	}

// 	if string(sa.ClientKeyData) != string(decodedStr) {
// 		t.Errorf("service account cert data and input do not match: expected %s, got %s\n",
// 			string(sa.ClientKeyData), string(decodedStr))
// 	}
// }

// func TestPopulateServiceAccountTokenDataAction(t *testing.T) {
// 	// create the in-memory repository
// 	repo := test.NewRepository(true)
// 	tokenData := "abcdefghijklmnop"

// 	// create a new project
// 	repo.Project.CreateProject(&models.Project{
// 		Name: "test-project",
// 	})

// 	// create a ServiceAccountCandidate from a kubeconfig
// 	saCandidates, err := kubernetes.GetServiceAccountCandidates([]byte(BearerTokenWithoutData), false)

// 	if err != nil {
// 		t.Fatalf("%v\n", err)
// 	}

// 	for _, saCandidate := range saCandidates {
// 		repo.ServiceAccount.CreateServiceAccountCandidate(saCandidate)
// 	}

// 	// create a new form
// 	form := forms.TokenDataAction{
// 		ServiceAccountActionResolver: &forms.ServiceAccountActionResolver{
// 			ServiceAccountCandidateID: 1,
// 		},
// 		TokenData: tokenData,
// 	}

// 	err = form.PopulateServiceAccount(repo.ServiceAccount)

// 	if err != nil {
// 		t.Fatalf("%v\n", err)
// 	}

// 	sa, err := repo.ServiceAccount.CreateServiceAccount(form.ServiceAccountActionResolver.SA)

// 	if len(sa.Clusters) != 1 {
// 		t.Fatalf("cluster not written\n")
// 	}

// 	if sa.Clusters[0].ServiceAccountID != 1 {
// 		t.Errorf("service account ID of joined cluster is not 1")
// 	}

// 	if sa.Integration != models.Bearer {
// 		t.Errorf("service account auth mechanism is not %s\n", models.Bearer)
// 	}

// 	if string(sa.Token) != tokenData {
// 		t.Errorf("service account token data is wrong: expected %s, got %s\n",
// 			tokenData, sa.Token)
// 	}
// }

// func TestPopulateServiceAccountGCPKeyDataAction(t *testing.T) {
// 	// create the in-memory repository
// 	repo := test.NewRepository(true)
// 	gcpKeyData := []byte(`{"key": "data"}`)

// 	// create a new project
// 	repo.Project.CreateProject(&models.Project{
// 		Name: "test-project",
// 	})

// 	// create a ServiceAccountCandidate from a kubeconfig
// 	saCandidates, err := kubernetes.GetServiceAccountCandidates([]byte(GCPPlugin), false)

// 	if err != nil {
// 		t.Fatalf("%v\n", err)
// 	}

// 	for _, saCandidate := range saCandidates {
// 		repo.ServiceAccount.CreateServiceAccountCandidate(saCandidate)
// 	}

// 	// create a new form
// 	form := forms.GCPKeyDataAction{
// 		ServiceAccountActionResolver: &forms.ServiceAccountActionResolver{
// 			ServiceAccountCandidateID: 1,
// 		},
// 		GCPKeyData: string(gcpKeyData),
// 	}

// 	err = form.PopulateServiceAccount(repo.ServiceAccount)

// 	if err != nil {
// 		t.Fatalf("%v\n", err)
// 	}

// 	sa, err := repo.ServiceAccount.CreateServiceAccount(form.ServiceAccountActionResolver.SA)

// 	if len(sa.Clusters) != 1 {
// 		t.Fatalf("cluster not written\n")
// 	}

// 	if sa.Clusters[0].ServiceAccountID != 1 {
// 		t.Errorf("service account ID of joined cluster is not 1")
// 	}

// 	if sa.Integration != models.GCP {
// 		t.Errorf("service account auth mechanism is not %s\n", models.GCP)
// 	}

// 	if string(sa.GCPKeyData) != string(gcpKeyData) {
// 		t.Errorf("service account token data is wrong: expected %s, got %s\n",
// 			string(sa.GCPKeyData), string(gcpKeyData))
// 	}
// }

// func TestPopulateServiceAccountAWSKeyDataAction(t *testing.T) {
// 	// create the in-memory repository
// 	repo := test.NewRepository(true)

// 	// create a new project
// 	repo.Project.CreateProject(&models.Project{
// 		Name: "test-project",
// 	})

// 	// create a ServiceAccountCandidate from a kubeconfig
// 	saCandidates, err := kubernetes.GetServiceAccountCandidates([]byte(AWSEKSGetTokenExec), false)

// 	if err != nil {
// 		t.Fatalf("%v\n", err)
// 	}

// 	for _, saCandidate := range saCandidates {
// 		repo.ServiceAccount.CreateServiceAccountCandidate(saCandidate)
// 	}

// 	// create a new form
// 	form := forms.AWSDataAction{
// 		ServiceAccountActionResolver: &forms.ServiceAccountActionResolver{
// 			ServiceAccountCandidateID: 1,
// 		},
// 		AWSAccessKeyID:     "ALSDKJFADSF",
// 		AWSSecretAccessKey: "ASDLFKJALSDKFJ",
// 		AWSClusterID:       "cluster-test",
// 	}

// 	err = form.PopulateServiceAccount(repo.ServiceAccount)

// 	if err != nil {
// 		t.Fatalf("%v\n", err)
// 	}

// 	sa, err := repo.ServiceAccount.CreateServiceAccount(form.ServiceAccountActionResolver.SA)

// 	if len(sa.Clusters) != 1 {
// 		t.Fatalf("cluster not written\n")
// 	}

// 	if sa.Clusters[0].ServiceAccountID != 1 {
// 		t.Errorf("service account ID of joined cluster is not 1")
// 	}

// 	if sa.Integration != models.AWS {
// 		t.Errorf("service account auth mechanism is not %s\n", models.AWS)
// 	}

// 	if string(sa.AWSAccessKeyID) != "ALSDKJFADSF" {
// 		t.Errorf("service account aws access key id is wrong: expected %s, got %s\n",
// 			"ALSDKJFADSF", sa.AWSAccessKeyID)
// 	}

// 	if string(sa.AWSSecretAccessKey) != "ASDLFKJALSDKFJ" {
// 		t.Errorf("service account aws access secret key is wrong: expected %s, got %s\n",
// 			"ASDLFKJALSDKFJ", sa.AWSSecretAccessKey)
// 	}

// 	if string(sa.AWSClusterID) != "cluster-test" {
// 		t.Errorf("service account aws cluster id is wrong: expected %s, got %s\n",
// 			"cluster-test", sa.AWSClusterID)
// 	}
// }

// func TestPopulateServiceAccountOIDCAction(t *testing.T) {
// 	// create the in-memory repository
// 	repo := test.NewRepository(true)

// 	// create a new project
// 	repo.Project.CreateProject(&models.Project{
// 		Name: "test-project",
// 	})

// 	// create a ServiceAccountCandidate from a kubeconfig
// 	saCandidates, err := kubernetes.GetServiceAccountCandidates([]byte(OIDCAuthWithoutData), false)

// 	if err != nil {
// 		t.Fatalf("%v\n", err)
// 	}

// 	for _, saCandidate := range saCandidates {
// 		repo.ServiceAccount.CreateServiceAccountCandidate(saCandidate)
// 	}

// 	// create a new form
// 	form := forms.OIDCIssuerDataAction{
// 		ServiceAccountActionResolver: &forms.ServiceAccountActionResolver{
// 			ServiceAccountCandidateID: 1,
// 		},
// 		OIDCIssuerCAData: "LS0tLS1CRUdJTiBDRVJ=",
// 	}

// 	err = form.PopulateServiceAccount(repo.ServiceAccount)

// 	if err != nil {
// 		t.Fatalf("%v\n", err)
// 	}

// 	sa, err := repo.ServiceAccount.CreateServiceAccount(form.ServiceAccountActionResolver.SA)

// 	if len(sa.Clusters) != 1 {
// 		t.Fatalf("cluster not written\n")
// 	}

// 	if sa.Clusters[0].ServiceAccountID != 1 {
// 		t.Errorf("service account ID of joined cluster is not 1")
// 	}

// 	if sa.Integration != models.OIDC {
// 		t.Errorf("service account auth mechanism is not %s\n", models.OIDC)
// 	}

// 	if string(sa.OIDCCertificateAuthorityData) != "LS0tLS1CRUdJTiBDRVJ=" {
// 		t.Errorf("service account key data and input do not match: expected %s, got %s\n",
// 			string(sa.OIDCCertificateAuthorityData), "LS0tLS1CRUdJTiBDRVJ=")
// 	}
// }
