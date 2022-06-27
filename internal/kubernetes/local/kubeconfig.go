package local

import (
	"encoding/base64"
	"fmt"
	"io/ioutil"
	"os"
	"path/filepath"

	"github.com/porter-dev/porter/internal/kubernetes"

	k8s "k8s.io/client-go/kubernetes"
	"k8s.io/client-go/tools/clientcmd"
	"k8s.io/client-go/tools/clientcmd/api"
	clientcmdapi "k8s.io/client-go/tools/clientcmd/api"
	"k8s.io/client-go/util/homedir"
)

// GetKubeconfigFromHost returns the kubeconfig for a list of contexts using default
// options set on the host, or an explicit kubeconfig path. It then strips the kubeconfig
// of contexts not specified in the contexts array, and returns generate kubeconfig.
func GetKubeconfigFromHost(kubeconfigPath string, contexts []string) ([]byte, error) {
	kubeconfigPath, err := ResolveKubeconfigPath(kubeconfigPath)

	if err != nil {
		return nil, err
	}

	loadingRules := clientcmd.NewDefaultClientConfigLoadingRules()
	loadingRules.ExplicitPath = kubeconfigPath

	clientConf := clientcmd.NewNonInteractiveDeferredLoadingClientConfig(loadingRules, &clientcmd.ConfigOverrides{})
	rawConf, err := clientConf.RawConfig()

	if err != nil {
		return nil, err
	}

	if len(contexts) == 0 {
		contexts = []string{rawConf.CurrentContext}

		if contexts[0] == "" {
			return nil, fmt.Errorf("at least one context must be specified")
		}
	}

	conf, err := stripAndValidateClientContexts(&rawConf, contexts[0], contexts)

	if err != nil {
		return nil, err
	}

	strippedRawConf, err := conf.RawConfig()

	if err != nil {
		return nil, err
	}

	return clientcmd.Write(strippedRawConf)
}

// GetSelfAgentFromFileConfig reads a kubeconfig from a local file and generates an
// Agent from that kubeconfig
func GetSelfAgentFromFileConfig(kubeconfigPath string) (*kubernetes.Agent, error) {
	configBytes, err := GetKubeconfigFromHost(kubeconfigPath, []string{})

	if err != nil {
		return nil, err
	}

	cmdConf, err := clientcmd.NewClientConfigFromBytes(configBytes)

	if err != nil {
		return nil, err
	}

	restConf, err := cmdConf.ClientConfig()

	if err != nil {
		return nil, err
	}

	var namespace string
	cmdConfNamespace, _, err := cmdConf.Namespace()

	if err == nil && cmdConfNamespace != "" {
		namespace = cmdConfNamespace
	}

	restClientGetter := kubernetes.NewRESTClientGetterFromInClusterConfig(restConf, namespace)
	clientset, err := k8s.NewForConfig(restConf)

	return &kubernetes.Agent{
		RESTClientGetter: restClientGetter,
		Clientset:        clientset,
	}, nil
}

// ResolveKubeconfigPath finds the path to a kubeconfig, first searching for the
// passed string, then in the home directory, then as an env variable.
func ResolveKubeconfigPath(kubeconfigPath string) (string, error) {
	envVarName := clientcmd.RecommendedConfigPathEnvVar

	if kubeconfigPath != "" {
		if _, err := os.Stat(kubeconfigPath); os.IsNotExist(err) {
			// the specified kubeconfig does not exist, throw error
			return "", fmt.Errorf("kubeconfig not found: %s does not exist", kubeconfigPath)
		}
	}

	if kubeconfigPath == "" {
		if os.Getenv(envVarName) == "" {
			if home := homedir.HomeDir(); home != "" {
				kubeconfigPath = filepath.Join(home, ".kube", "config")
			}
		} else {
			kubeconfigPath = os.Getenv(envVarName)
		}
	}

	return kubeconfigPath, nil
}

// GetConfigFromHostWithCertData gets the kubeconfig using default options set on the host:
// the kubeconfig can either be retrieved from a specified path or an environment variable.
// This function only outputs a clientcmd that uses the allowedContexts.
//
// This function also populates all of the certificate data that's specified as a filepath.
func GetConfigFromHostWithCertData(kubeconfigPath string, allowedContexts []string) (clientcmd.ClientConfig, error) {
	envVarName := clientcmd.RecommendedConfigPathEnvVar

	if kubeconfigPath != "" {
		if _, err := os.Stat(kubeconfigPath); os.IsNotExist(err) {
			// the specified kubeconfig does not exist so fallback to other options
			kubeconfigPath = ""
		}
	}

	if kubeconfigPath == "" && os.Getenv(envVarName) == "" {
		if home := homedir.HomeDir(); home != "" {
			kubeconfigPath = filepath.Join(home, ".kube", "config")
		}
	}

	loadingRules := clientcmd.NewDefaultClientConfigLoadingRules()
	loadingRules.ExplicitPath = kubeconfigPath

	clientConf := clientcmd.NewNonInteractiveDeferredLoadingClientConfig(loadingRules, &clientcmd.ConfigOverrides{})
	rawConf, err := clientConf.RawConfig()

	if err != nil {
		return nil, err
	}

	populateCertificateRefs(&rawConf)
	populateOIDCPluginCerts(&rawConf)

	if len(allowedContexts) == 0 {
		allowedContexts = []string{rawConf.CurrentContext}

		if allowedContexts[0] == "" {
			return nil, fmt.Errorf("at least one context must be specified")
		}
	}

	res, err := stripAndValidateClientContexts(&rawConf, allowedContexts[0], allowedContexts)

	if err != nil {
		return nil, err
	}

	return res, nil
}

func stripAndValidateClientContexts(
	rawConf *clientcmdapi.Config,
	currentContext string,
	allowedContexts []string,
) (clientcmd.ClientConfig, error) {
	// grab a copy to get the pointer and set clusters, authinfos, and contexts to empty
	copyConf := rawConf.DeepCopy()

	copyConf.Clusters = make(map[string]*api.Cluster)
	copyConf.AuthInfos = make(map[string]*api.AuthInfo)
	copyConf.Contexts = make(map[string]*api.Context)
	copyConf.CurrentContext = currentContext

	// put allowed clusters in a map
	aContextMap := kubernetes.CreateAllowedContextMap(allowedContexts)

	for contextName, context := range rawConf.Contexts {
		userName := context.AuthInfo
		clusterName := context.Cluster
		authInfo, userFound := rawConf.AuthInfos[userName]
		cluster, clusterFound := rawConf.Clusters[clusterName]

		// make sure the cluster is "allowed"
		_, isAllowed := aContextMap[contextName]

		if userFound && clusterFound && isAllowed {
			copyConf.Clusters[clusterName] = cluster
			copyConf.AuthInfos[userName] = authInfo
			copyConf.Contexts[contextName] = context
		}
	}

	// validate the copyConf and create a ClientConfig
	err := clientcmd.Validate(*copyConf)

	if err != nil {
		return nil, err
	}

	clientConf := clientcmd.NewDefaultClientConfig(*copyConf, &clientcmd.ConfigOverrides{})

	return clientConf, nil
}

func populateCertificateRefs(config *clientcmdapi.Config) {
	for _, cluster := range config.Clusters {
		refs := clientcmd.GetClusterFileReferences(cluster)
		for _, str := range refs {
			// only write certificate if the file reference is CA
			if *str != cluster.CertificateAuthority {
				break
			}

			fileBytes, err := ioutil.ReadFile(*str)

			if err != nil {
				continue
			}

			cluster.CertificateAuthorityData = fileBytes
			cluster.CertificateAuthority = ""
		}
	}

	for _, authInfo := range config.AuthInfos {
		refs := clientcmd.GetAuthInfoFileReferences(authInfo)
		for _, str := range refs {
			if *str == "" {
				continue
			}

			var refType int

			if authInfo.ClientCertificate == *str {
				refType = 0
			} else if authInfo.ClientKey == *str {
				refType = 1
			} else if authInfo.TokenFile == *str {
				refType = 2
			}

			fileBytes, err := ioutil.ReadFile(*str)

			if err != nil {
				continue
			}

			if refType == 0 {
				authInfo.ClientCertificateData = fileBytes
				authInfo.ClientCertificate = ""
			} else if refType == 1 {
				authInfo.ClientKeyData = fileBytes
				authInfo.ClientKey = ""
			} else if refType == 2 {
				authInfo.Token = base64.StdEncoding.EncodeToString(fileBytes)
				authInfo.TokenFile = ""
			}
		}
	}
}

func populateOIDCPluginCerts(config *clientcmdapi.Config) {
	for _, authInfo := range config.AuthInfos {
		if authInfo.AuthProvider != nil && authInfo.AuthProvider.Name == "oidc" {
			if ca, ok := authInfo.AuthProvider.Config["idp-certificate-authority"]; ok && ca != "" {
				fileBytes, err := ioutil.ReadFile(ca)

				if err != nil {
					continue
				}

				authInfo.AuthProvider.Config["idp-certificate-authority-data"] = base64.StdEncoding.EncodeToString(fileBytes)
				delete(authInfo.AuthProvider.Config, "idp-certificate-authority")
			}
		}
	}
}
