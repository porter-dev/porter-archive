package kubernetes

import (
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"github.com/porter-dev/porter/internal/models"
	"k8s.io/apimachinery/pkg/api/meta"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/cli-runtime/pkg/genericclioptions"
	"k8s.io/client-go/discovery"
	diskcached "k8s.io/client-go/discovery/cached/disk"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/kubernetes/fake"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/restmapper"
	"k8s.io/client-go/tools/clientcmd"
	"k8s.io/client-go/util/homedir"

	// add oidc provider here
	_ "k8s.io/client-go/plugin/pkg/client/auth"
)

// GetAgentOutOfClusterConfig creates a new Agent using the OutOfClusterConfig
func GetAgentOutOfClusterConfig(conf *OutOfClusterConfig) (*Agent, error) {
	restConf, err := conf.ToRESTConfig()

	if err != nil {
		return nil, err
	}

	clientset, err := kubernetes.NewForConfig(restConf)

	if err != nil {
		return nil, err
	}

	return &Agent{conf, clientset}, nil
}

// GetAgentInClusterConfig uses the service account that kubernetes
// gives to pods to connect
func GetAgentInClusterConfig() (*Agent, error) {
	conf, err := rest.InClusterConfig()

	if err != nil {
		return nil, err
	}

	restClientGetter := newRESTClientGetterFromInClusterConfig(conf)
	clientset, err := kubernetes.NewForConfig(conf)

	return &Agent{restClientGetter, clientset}, nil
}

// GetAgentTesting creates a new Agent using an optional existing storage class
func GetAgentTesting(objects ...runtime.Object) *Agent {
	return &Agent{&fakeRESTClientGetter{}, fake.NewSimpleClientset(objects...)}
}

// UpdateTokenCacheFunc is a function that updates the token cache
// with a new token and expiry time
type UpdateTokenCacheFunc func(token string, expiry time.Time) error

// OutOfClusterConfig is the set of parameters required for an out-of-cluster connection.
// This implements RESTClientGetter
type OutOfClusterConfig struct {
	ServiceAccount   *models.ServiceAccount `form:"required"`
	ClusterID        uint                   `json:"cluster_id" form:"required"`
	UpdateTokenCache UpdateTokenCacheFunc
}

// ToRESTConfig creates a kubernetes REST client factory -- it calls ClientConfig on
// the result of ToRawKubeConfigLoader, and also adds a custom http transport layer
// if necessary (required for GCP auth)
func (conf *OutOfClusterConfig) ToRESTConfig() (*rest.Config, error) {
	restConf, err := conf.ToRawKubeConfigLoader().ClientConfig()

	if err != nil {
		return nil, err
	}

	rest.SetKubernetesDefaults(restConf)
	return restConf, nil
}

// ToRawKubeConfigLoader creates a clientcmd.ClientConfig from the raw kubeconfig found in
// the OutOfClusterConfig. It does not implement loading rules or overrides.
func (conf *OutOfClusterConfig) ToRawKubeConfigLoader() clientcmd.ClientConfig {
	cmdConf, _ := GetClientConfigFromServiceAccount(
		conf.ServiceAccount,
		conf.ClusterID,
		conf.UpdateTokenCache,
	)

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

// newRESTClientGetterFromInClusterConfig returns a RESTClientGetter using
// default values set from the *rest.Config
func newRESTClientGetterFromInClusterConfig(conf *rest.Config) genericclioptions.RESTClientGetter {
	cfs := genericclioptions.NewConfigFlags(false)

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
