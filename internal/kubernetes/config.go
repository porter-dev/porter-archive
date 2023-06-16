package kubernetes

import (
	"context"
	"encoding/base64"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"github.com/porter-dev/porter/internal/telemetry"

	"github.com/bufbuild/connect-go"
	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"
	"github.com/porter-dev/api-contracts/generated/go/porter/v1/porterv1connect"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/oauth"
	"github.com/porter-dev/porter/internal/repository"
	"golang.org/x/oauth2"
	"k8s.io/apimachinery/pkg/api/meta"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/cli-runtime/pkg/genericclioptions"
	"k8s.io/client-go/discovery"
	diskcached "k8s.io/client-go/discovery/cached/disk"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/kubernetes/fake"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/restmapper"
	"k8s.io/client-go/tools/clientcmd"
	"k8s.io/client-go/tools/clientcmd/api"
	"k8s.io/client-go/util/homedir"

	ints "github.com/porter-dev/porter/internal/models/integrations"

	// this line will register plugins
	_ "k8s.io/client-go/plugin/pkg/client/auth"
)

// GetDynamicClientOutOfClusterConfig creates a new dynamic client using the OutOfClusterConfig
func GetDynamicClientOutOfClusterConfig(conf *OutOfClusterConfig) (dynamic.Interface, error) {
	var restConf *rest.Config
	var err error

	if conf.AllowInClusterConnections && conf.Cluster.AuthMechanism == models.InCluster {
		restConf, err = rest.InClusterConfig()
	} else {
		restConf, err = conf.ToRESTConfig()
	}

	if err != nil {
		return nil, err
	}

	client, err := dynamic.NewForConfig(restConf)
	if err != nil {
		return nil, err
	}

	return client, nil
}

// GetAgentOutOfClusterConfig creates a new Agent using the OutOfClusterConfig
func GetAgentOutOfClusterConfig(ctx context.Context, conf *OutOfClusterConfig) (*Agent, error) {
	ctx, span := telemetry.NewSpan(ctx, "get-agent-out-of-cluster-config")
	defer span.End()

	if conf.AllowInClusterConnections && conf.Cluster.AuthMechanism == models.InCluster {
		return GetAgentInClusterConfig(ctx, conf.DefaultNamespace)
	}

	var restConf *rest.Config

	if conf.Cluster.ProvisionedBy == "CAPI" {
		telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "provisioner", Value: conf.Cluster.ProvisionedBy})

		rc, err := restConfigForCAPICluster(ctx, conf.CAPIManagementClusterClient, *conf.Cluster)
		if err != nil {
			return nil, telemetry.Error(ctx, span, err, "error getting rest config for capi cluster")
		}
		restConf = rc
	} else {
		telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "provisioner", Value: "non-capi"})

		rc, err := conf.ToRESTConfig()
		if err != nil {
			return nil, telemetry.Error(ctx, span, err, "error getting rest config")
		}
		restConf = rc
	}

	if restConf == nil {
		return nil, telemetry.Error(ctx, span, nil, "error getting rest config for cluster")
	}

	clientset, err := kubernetes.NewForConfig(restConf)
	if err != nil {
		return nil, telemetry.Error(ctx, span, err, "error getting new clientset for config")
	}

	agent := NewKubernetesAgent(ctx, conf, clientset)

	return &agent, nil
}

// restConfigForCAPICluster gets the kubernetes rest API client for a CAPI cluster
func restConfigForCAPICluster(ctx context.Context, mgmtClusterConnection porterv1connect.ClusterControlPlaneServiceClient, cluster models.Cluster) (*rest.Config, error) {
	ctx, span := telemetry.NewSpan(ctx, "rest-config-for-capi-cluster")
	defer span.End()

	kc, err := kubeConfigForCAPICluster(ctx, mgmtClusterConnection, cluster)
	if err != nil {
		return nil, telemetry.Error(ctx, span, err, "error getting kubeconfig")
	}

	rc, err := writeKubeConfigToFileAndRestClient([]byte(kc))
	if err != nil {
		return nil, telemetry.Error(ctx, span, err, "error writing kubeconfig to file")
	}
	return rc, nil
}

// kubeConfigForCAPICluster grabs the raw kube config for a capi cluster
func kubeConfigForCAPICluster(ctx context.Context, mgmtClusterConnection porterv1connect.ClusterControlPlaneServiceClient, cluster models.Cluster) (string, error) {
	ctx, span := telemetry.NewSpan(ctx, "kubeconfig-capi")
	defer span.End()

	if cluster.ProjectID == 0 {
		return "", telemetry.Error(ctx, span, nil, "missing project id")
	}
	if cluster.ID == 0 {
		return "", telemetry.Error(ctx, span, nil, "missing cluster id")
	}

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "project-id", Value: cluster.ProjectID},
		telemetry.AttributeKV{Key: "cluster-id", Value: cluster.ID},
	)

	kubeconfigResp, err := mgmtClusterConnection.KubeConfigForCluster(ctx, connect.NewRequest(
		&porterv1.KubeConfigForClusterRequest{
			ProjectId: int64(cluster.ProjectID),
			ClusterId: int64(cluster.ID),
		},
	))
	if err != nil {
		return "", telemetry.Error(ctx, span, err, "error getting capi config")
	}
	if kubeconfigResp.Msg == nil {
		return "", telemetry.Error(ctx, span, nil, "no msg returned for capi cluster")
	}
	if kubeconfigResp.Msg.KubeConfig == "" {
		return "", telemetry.Error(ctx, span, nil, "no kubeconfig returned for capi cluster")
	}
	decodedKubeconfig, err := base64.StdEncoding.DecodeString(kubeconfigResp.Msg.KubeConfig)
	if err != nil {
		return "", telemetry.Error(ctx, span, nil, "error decoding capi cluster")
	}
	return string(decodedKubeconfig), nil
}

// writeKubeConfigToFileAndRestClient writes a literal kubeconfig to a temporary file
// then uses the client-go kubernetes package to create a rest.Config from it
func writeKubeConfigToFileAndRestClient(kubeconf []byte) (*rest.Config, error) {
	tmpFile, err := os.CreateTemp(os.TempDir(), "kconf-")
	if err != nil {
		return nil, fmt.Errorf("unable to create temp file: %w", err)
	}
	defer os.Remove(tmpFile.Name())

	if _, err = tmpFile.Write(kubeconf); err != nil {
		return nil, fmt.Errorf("unable to write to temp file: %w", err)
	}
	if err := tmpFile.Close(); err != nil {
		return nil, fmt.Errorf("unable to close temp file: %w", err)
	}
	kconfPath, err := filepath.Abs(tmpFile.Name())
	if err != nil {
		return nil, fmt.Errorf("unable to find temp file: %w", err)
	}
	rest, err := clientcmd.BuildConfigFromFlags("", kconfPath)
	if err != nil {
		return nil, fmt.Errorf("unable create rest config from temp file: %w", err)
	}
	return rest, nil
}

// IsInCluster returns true if the process is running in a Kubernetes cluster,
// false otherwise
func IsInCluster() bool {
	_, err := rest.InClusterConfig()

	// If the error is not nil, it is either rest.ErrNotInCluster or the in-cluster
	// config cannot be read. In either case, in-cluster operations are not supported.
	return err == nil
}

// GetAgentInClusterConfig uses the service account that kubernetes
// gives to pods to connect
func GetAgentInClusterConfig(ctx context.Context, namespace string) (*Agent, error) {
	conf, err := rest.InClusterConfig()
	if err != nil {
		return nil, fmt.Errorf("error getting in cluster config: %w", err)
	}

	restClientGetter := NewRESTClientGetterFromInClusterConfig(conf, namespace)
	clientset, err := kubernetes.NewForConfig(conf)
	if err != nil {
		return nil, fmt.Errorf("error getting new clientset for config: %w", err)
	}

	agent := NewKubernetesAgent(ctx, restClientGetter, clientset)

	return &agent, nil
}

// GetAgentTesting creates a new Agent using an optional existing storage class
// TODO: this should be in a test package, not here.
func GetAgentTesting(objects ...runtime.Object) *Agent {
	agent := NewKubernetesAgent(context.Background(), &fakeRESTClientGetter{}, fake.NewSimpleClientset(objects...))

	return &agent
}

// OutOfClusterConfig is the set of parameters required for an out-of-cluster connection.
// This implements RESTClientGetter
type OutOfClusterConfig struct {
	Cluster                   *models.Cluster
	Repo                      repository.Repository
	DefaultNamespace          string // optional
	AllowInClusterConnections bool
	Timeout                   time.Duration // optional

	// Only required if using DigitalOcean OAuth as an auth mechanism
	DigitalOceanOAuth *oauth2.Config

	CAPIManagementClusterClient porterv1connect.ClusterControlPlaneServiceClient
}

// ToRESTConfig creates a kubernetes REST client factory -- it calls ClientConfig on
// the result of ToRawKubeConfigLoader, and also adds a custom http transport layer
// if necessary (required for GCP auth).
// TODO: this should be split out from OutOfClusterConfig, and implemented separately in order to wrap the kubernetes RESTGetter interface.
// Until then, we lose context propagation on all these calls
func (conf *OutOfClusterConfig) ToRESTConfig() (*rest.Config, error) {
	ctx, span := telemetry.NewSpan(context.Background(), "ooc-to-rest-config")
	defer span.End()

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "cluster-id", Value: conf.Cluster.ID},
		telemetry.AttributeKV{Key: "project-id", Value: conf.Cluster.ProjectID},
	)

	if conf.Cluster.ProvisionedBy == "CAPI" {
		telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "capi-provisioned", Value: true})

		rc, err := restConfigForCAPICluster(ctx, conf.CAPIManagementClusterClient, *conf.Cluster)
		if err != nil {
			return nil, telemetry.Error(ctx, span, err, "error getting config for capi cluster")
		}
		return rc, nil
	}

	cmdConf, err := conf.GetClientConfigFromCluster(ctx)
	if err != nil {
		return nil, telemetry.Error(ctx, span, err, "error getting client config from cluster")
	}

	restConf, err := cmdConf.ClientConfig()
	if err != nil {
		return nil, telemetry.Error(ctx, span, err, "error getting client config")
	}

	restConf.Timeout = conf.Timeout

	rest.SetKubernetesDefaults(restConf)
	return restConf, nil
}

// ToRawKubeConfigLoader creates a clientcmd.ClientConfig from the raw kubeconfig found in
// the OutOfClusterConfig. It does not implement loading rules or overrides.
func (conf *OutOfClusterConfig) ToRawKubeConfigLoader() clientcmd.ClientConfig {
	ctx, span := telemetry.NewSpan(context.Background(), "ooc-to-raw-kubeconfig-loader")
	defer span.End()

	cmdConf, _ := conf.GetClientConfigFromCluster(ctx)

	return cmdConf
}

// ToDiscoveryClient returns a CachedDiscoveryInterface using a computed RESTConfig
// It's required to implement the interface genericclioptions.RESTClientGetter
func (conf *OutOfClusterConfig) ToDiscoveryClient() (discovery.CachedDiscoveryInterface, error) {
	// From: k8s.io/cli-runtime/pkg/genericclioptions/config_flags.go > func (*configFlags) ToDiscoveryClient()
	restConf, err := conf.ToRESTConfig()
	if err != nil {
		return nil, err
	}

	restConf.Burst = 100
	defaultHTTPCacheDir := filepath.Join(homedir.HomeDir(), ".kube", "http-cache")

	// takes the parentDir and the host and comes up with a "usually non-colliding" name for the discoveryCacheDir
	parentDir := filepath.Join(homedir.HomeDir(), ".kube", "cache", "discovery")
	// strip the optional scheme from host if its there:
	schemelessHost := strings.Replace(strings.Replace(restConf.Host, "https://", "", 1), "http://", "", 1)
	// now do a simple collapse of non-AZ09 characters.  Collisions are possible but unlikely.  Even if we do collide the problem is short lived
	safeHost := regexp.MustCompile(`[^(\w/\.)]`).ReplaceAllString(schemelessHost, "_")
	discoveryCacheDir := filepath.Join(parentDir, safeHost)

	return diskcached.NewCachedDiscoveryClientForConfig(restConf, discoveryCacheDir, defaultHTTPCacheDir, time.Duration(10*time.Minute))
}

// ToRESTMapper returns a mapper
func (conf *OutOfClusterConfig) ToRESTMapper() (meta.RESTMapper, error) {
	// From: k8s.io/cli-runtime/pkg/genericclioptions/config_flags.go > func (*configFlags) ToRESTMapper()
	discoveryClient, err := conf.ToDiscoveryClient()
	if err != nil {
		return nil, err
	}

	mapper := restmapper.NewDeferredDiscoveryRESTMapper(discoveryClient)
	expander := restmapper.NewShortcutExpander(mapper, discoveryClient)
	return expander, nil
}

// GetClientConfigFromCluster will construct new clientcmd.ClientConfig using
// the configuration saved within a Cluster model
func (conf *OutOfClusterConfig) GetClientConfigFromCluster(ctx context.Context) (clientcmd.ClientConfig, error) {
	ctx, span := telemetry.NewSpan(ctx, "ooc-get-client-config-from-cluster")
	defer span.End()

	if conf.Cluster == nil {
		return nil, telemetry.Error(ctx, span, nil, "cluster cannot be nil")
	}

	if conf.Cluster.ProvisionedBy == "CAPI" {
		telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "capi-provisioned", Value: true})

		rc, err := kubeConfigForCAPICluster(ctx, conf.CAPIManagementClusterClient, *conf.Cluster)
		if err != nil {
			return nil, telemetry.Error(ctx, span, err, "error getting capi kube config")
		}
		clientConfig, err := clientcmd.NewClientConfigFromBytes([]byte(rc))
		if err != nil {
			return nil, telemetry.Error(ctx, span, err, "error getting config from bytes")
		}
		rawConfig, err := clientConfig.RawConfig()
		if err != nil {
			return nil, telemetry.Error(ctx, span, err, "error getting raw config")
		}

		overrides := &clientcmd.ConfigOverrides{}

		if conf.DefaultNamespace != "" {
			telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "namespace-override", Value: conf.DefaultNamespace})
			overrides.Context = api.Context{
				Namespace: conf.DefaultNamespace,
			}
		}

		return clientcmd.NewDefaultClientConfig(rawConfig, overrides), nil
	}

	if conf.Cluster.AuthMechanism == models.Local {
		telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "local-provisioned", Value: true})

		kubeAuth, err := conf.Repo.KubeIntegration().ReadKubeIntegration(
			conf.Cluster.ProjectID,
			conf.Cluster.KubeIntegrationID,
		)
		if err != nil {
			return nil, telemetry.Error(ctx, span, err, "error reading kube integration")
		}

		return clientcmd.NewClientConfigFromBytes(kubeAuth.Kubeconfig)
	}

	apiConfig, err := conf.CreateRawConfigFromCluster(ctx)
	if err != nil {
		return nil, telemetry.Error(ctx, span, err, "error creating raw config from cluster")
	}

	overrides := &clientcmd.ConfigOverrides{}

	if conf.DefaultNamespace != "" {
		telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "namespace-override", Value: conf.DefaultNamespace})
		overrides.Context = api.Context{
			Namespace: conf.DefaultNamespace,
		}
	}

	config := clientcmd.NewDefaultClientConfig(*apiConfig, overrides)

	return config, nil
}

func (conf *OutOfClusterConfig) CreateRawConfigFromCluster(ctx context.Context) (*api.Config, error) {
	ctx, span := telemetry.NewSpan(ctx, "ooc-create-raw-config-from-cluster")
	defer span.End()

	cluster := conf.Cluster

	apiConfig := &api.Config{}

	clusterMap := make(map[string]*api.Cluster)

	clusterMap[cluster.Name] = &api.Cluster{
		Server:                   cluster.Server,
		LocationOfOrigin:         cluster.ClusterLocationOfOrigin,
		TLSServerName:            cluster.TLSServerName,
		InsecureSkipTLSVerify:    cluster.InsecureSkipTLSVerify,
		CertificateAuthorityData: cluster.CertificateAuthorityData,
	}

	// construct the auth infos
	authInfoName := cluster.Name + "-" + string(cluster.AuthMechanism)

	authInfoMap := make(map[string]*api.AuthInfo)

	authInfoMap[authInfoName] = &api.AuthInfo{
		LocationOfOrigin: cluster.UserLocationOfOrigin,
		Impersonate:      cluster.UserImpersonate,
	}

	if groups := strings.Split(cluster.UserImpersonateGroups, ","); len(groups) > 0 && groups[0] != "" {
		authInfoMap[authInfoName].ImpersonateGroups = groups
	}

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "auth-mechanism", Value: cluster.AuthMechanism},
		telemetry.AttributeKV{Key: "server", Value: cluster.Server},
	)

	switch cluster.AuthMechanism {
	case models.X509:
		kubeAuth, err := conf.Repo.KubeIntegration().ReadKubeIntegration(
			cluster.ProjectID,
			cluster.KubeIntegrationID,
		)
		if err != nil {
			return nil, telemetry.Error(ctx, span, err, "error reading kube integration")
		}

		authInfoMap[authInfoName].ClientCertificateData = kubeAuth.ClientCertificateData
		authInfoMap[authInfoName].ClientKeyData = kubeAuth.ClientKeyData
	case models.Basic:
		kubeAuth, err := conf.Repo.KubeIntegration().ReadKubeIntegration(
			cluster.ProjectID,
			cluster.KubeIntegrationID,
		)
		if err != nil {
			return nil, telemetry.Error(ctx, span, err, "error reading kube integration")
		}

		authInfoMap[authInfoName].Username = string(kubeAuth.Username)
		authInfoMap[authInfoName].Password = string(kubeAuth.Password)
	case models.Bearer:
		kubeAuth, err := conf.Repo.KubeIntegration().ReadKubeIntegration(
			cluster.ProjectID,
			cluster.KubeIntegrationID,
		)
		if err != nil {
			return nil, telemetry.Error(ctx, span, err, "error reading kube integration")
		}

		authInfoMap[authInfoName].Token = string(kubeAuth.Token)
	case models.OIDC:
		oidcAuth, err := conf.Repo.OIDCIntegration().ReadOIDCIntegration(
			cluster.ProjectID,
			cluster.OIDCIntegrationID,
		)
		if err != nil {
			return nil, telemetry.Error(ctx, span, err, "error reading oidc integration")
		}

		authInfoMap[authInfoName].AuthProvider = &api.AuthProviderConfig{
			Name: "oidc",
			Config: map[string]string{
				"idp-issuer-url":                 string(oidcAuth.IssuerURL),
				"client-id":                      string(oidcAuth.ClientID),
				"client-secret":                  string(oidcAuth.ClientSecret),
				"idp-certificate-authority-data": string(oidcAuth.CertificateAuthorityData),
				"id-token":                       string(oidcAuth.IDToken),
				"refresh-token":                  string(oidcAuth.RefreshToken),
			},
		}
	case models.GCP:
		gcpAuth, err := conf.Repo.GCPIntegration().ReadGCPIntegration(
			cluster.ProjectID,
			cluster.GCPIntegrationID,
		)
		if err != nil {
			return nil, telemetry.Error(ctx, span, err, "error reading gcp integration")
		}

		tok, err := gcpAuth.GetBearerToken(
			conf.getTokenCache,
			conf.setTokenCache,
			"https://www.googleapis.com/auth/cloud-platform",
		)
		if err != nil {
			return nil, telemetry.Error(ctx, span, err, "error getting gcp token")
		}
		if tok == nil {
			return nil, telemetry.Error(ctx, span, nil, "unable to get gcp token")
		}

		// add this as a bearer token
		authInfoMap[authInfoName].Token = tok.AccessToken
	case models.AWS:
		awsAuth, err := conf.Repo.AWSIntegration().ReadAWSIntegration(
			cluster.ProjectID,
			cluster.AWSIntegrationID,
		)
		if err != nil {
			return nil, telemetry.Error(ctx, span, err, "error reading aws integration")
		}

		awsClusterID := cluster.Name
		shouldOverride := false

		if cluster.AWSClusterID != "" {
			awsClusterID = cluster.AWSClusterID
			shouldOverride = true
		}

		tok, err := awsAuth.GetBearerToken(conf.getTokenCache, conf.setTokenCache, awsClusterID, shouldOverride)
		if err != nil {
			return nil, telemetry.Error(ctx, span, err, "unable to get AWS bearer token")
		}

		// add this as a bearer token
		authInfoMap[authInfoName].Token = tok
	case models.DO:
		oauthInt, err := conf.Repo.OAuthIntegration().ReadOAuthIntegration(
			cluster.ProjectID,
			cluster.DOIntegrationID,
		)
		if err != nil {
			return nil, telemetry.Error(ctx, span, err, "error reading oauth integration")
		}

		tok, _, err := oauth.GetAccessToken(oauthInt.SharedOAuthModel, conf.DigitalOceanOAuth, oauth.MakeUpdateOAuthIntegrationTokenFunction(oauthInt, conf.Repo))
		if err != nil {
			return nil, telemetry.Error(ctx, span, err, "unable to get oauth access token for Digital Ocean")
		}

		// add this as a bearer token
		authInfoMap[authInfoName].Token = tok
	case models.Azure:
		azInt, err := conf.Repo.AzureIntegration().ReadAzureIntegration(
			cluster.ProjectID,
			cluster.AzureIntegrationID,
		)
		if err != nil {
			return nil, telemetry.Error(ctx, span, err, "error reading azure integration")
		}

		authInfoMap[authInfoName].Token = string(azInt.AKSPassword)
	default:
		return nil, telemetry.Error(ctx, span, nil, "auth mechanism not supported")
	}

	// create a context of the cluster name
	contextMap := make(map[string]*api.Context)

	contextMap[cluster.Name] = &api.Context{
		LocationOfOrigin: cluster.ClusterLocationOfOrigin,
		Cluster:          cluster.Name,
		AuthInfo:         authInfoName,
	}

	apiConfig.Clusters = clusterMap
	apiConfig.AuthInfos = authInfoMap
	apiConfig.Contexts = contextMap
	apiConfig.CurrentContext = cluster.Name

	return apiConfig, nil
}

func (conf *OutOfClusterConfig) getTokenCache() (tok *ints.TokenCache, err error) {
	return &conf.Cluster.TokenCache.TokenCache, nil
}

func (conf *OutOfClusterConfig) setTokenCache(token string, expiry time.Time) error {
	_, err := conf.Repo.Cluster().UpdateClusterTokenCache(
		&ints.ClusterTokenCache{
			ClusterID: conf.Cluster.ID,
			TokenCache: ints.TokenCache{
				Token:  []byte(token),
				Expiry: expiry,
			},
		},
	)

	return err
}

// NewRESTClientGetterFromInClusterConfig returns a RESTClientGetter using
// default values set from the *rest.Config
func NewRESTClientGetterFromInClusterConfig(conf *rest.Config, namespace string) genericclioptions.RESTClientGetter {
	cfs := genericclioptions.NewConfigFlags(false)

	if namespace != "" {
		cfs.Namespace = &namespace
	}

	cfs.ClusterName = &conf.ServerName
	cfs.Insecure = &conf.Insecure
	cfs.APIServer = &conf.Host
	cfs.CAFile = &conf.CAFile
	cfs.KeyFile = &conf.KeyFile
	cfs.CertFile = &conf.CertFile
	cfs.BearerToken = &conf.BearerToken
	cfs.Timeout = stringptr(conf.Timeout.String())
	cfs.Impersonate = &conf.Impersonate.UserName
	cfs.ImpersonateGroup = &conf.Impersonate.Groups
	cfs.Username = &conf.Username
	cfs.Password = &conf.Password

	return cfs
}

func stringptr(val string) *string {
	return &val
}

type fakeRESTClientGetter struct{}

func (f *fakeRESTClientGetter) ToRESTConfig() (*rest.Config, error) {
	return nil, nil
}

func (f *fakeRESTClientGetter) ToRawKubeConfigLoader() clientcmd.ClientConfig {
	return nil
}

func (f *fakeRESTClientGetter) ToDiscoveryClient() (discovery.CachedDiscoveryInterface, error) {
	return nil, nil
}

func (f *fakeRESTClientGetter) ToRESTMapper() (meta.RESTMapper, error) {
	return nil, nil
}
