package kubernetes

import (
	"errors"

	"github.com/porter-dev/porter/internal/models"
	"k8s.io/client-go/tools/clientcmd"
	"k8s.io/client-go/tools/clientcmd/api"
)

// GetServiceAccountCandidates parses a kubeconfig for a list of service account
// candidates.
func GetServiceAccountCandidates(kubeconfig []byte) ([]*models.ServiceAccountCandidate, error) {
	config, err := clientcmd.NewClientConfigFromBytes(kubeconfig)

	if err != nil {
		return nil, err
	}

	rawConf, err := config.RawConfig()

	if err != nil {
		return nil, err
	}

	res := make([]*models.ServiceAccountCandidate, 0)

	for contextName, context := range rawConf.Contexts {
		clusterName := context.Cluster
		authInfoName := context.AuthInfo

		// get the auth mechanism and actions
		authMechanism, authInfoActions := parseAuthInfoForActions(rawConf.AuthInfos[authInfoName])
		clusterActions := parseClusterForActions(rawConf.Clusters[clusterName])

		actions := append(authInfoActions, clusterActions...)

		// if auth mechanism is unsupported, we'll skip it
		if authMechanism == models.NotAvailable {
			continue
		}

		// construct the raw kubeconfig that's relevant for that context
		contextConf, err := getConfigForContext(&rawConf, contextName)

		if err != nil {
			continue
		}

		rawBytes, err := clientcmd.Write(*contextConf)

		if err == nil {
			// create the candidate service account
			res = append(res, &models.ServiceAccountCandidate{
				Actions:         actions,
				Kind:            "connector",
				ClusterName:     clusterName,
				ClusterEndpoint: rawConf.Clusters[clusterName].Server,
				AuthMechanism:   authMechanism,
				Kubeconfig:      rawBytes,
			})
		}
	}

	return res, nil
}

// GetRawConfigFromBytes returns the clientcmdapi.Config from kubeconfig
// bytes
func GetRawConfigFromBytes(kubeconfig []byte) (*api.Config, error) {
	config, err := clientcmd.NewClientConfigFromBytes(kubeconfig)

	if err != nil {
		return nil, err
	}

	rawConf, err := config.RawConfig()

	if err != nil {
		return nil, err
	}

	return &rawConf, nil
}

// Parsing rules are:
//
// (1) If a client certificate + client key exist, uses x509 auth mechanism
// (2) If an oidc/gcp/aws plugin exists, uses that auth mechanism
// (3) If a bearer token exists, uses bearer token auth mechanism
// (4) If a username/password exist, uses basic auth mechanism
// (5) Otherwise, the config gets skipped
//
func parseAuthInfoForActions(authInfo *api.AuthInfo) (authMechanism string, actions []models.ServiceAccountAction) {
	actions = make([]models.ServiceAccountAction, 0)

	if (authInfo.ClientCertificate != "" || len(authInfo.ClientCertificateData) != 0) &&
		(authInfo.ClientKey != "" || len(authInfo.ClientKeyData) != 0) {
		if len(authInfo.ClientCertificateData) == 0 {
			actions = append(actions, models.ServiceAccountAction{
				Name:     models.ClientCertDataAction,
				Resolved: false,
			})
		}

		if len(authInfo.ClientKeyData) == 0 {
			actions = append(actions, models.ServiceAccountAction{
				Name:     models.ClientKeyDataAction,
				Resolved: false,
			})
		}

		return models.X509, actions
	}

	if authInfo.AuthProvider != nil {
		switch authInfo.AuthProvider.Name {
		case "oidc":
			_, isFile := authInfo.AuthProvider.Config["idp-certificate-authority"]
			data, isData := authInfo.AuthProvider.Config["idp-certificate-authority-data"]

			if isFile && (!isData || data == "") {
				return models.OIDC, []models.ServiceAccountAction{
					models.ServiceAccountAction{
						Name:     models.OIDCIssuerDataAction,
						Resolved: false,
					},
				}
			}

			return models.OIDC, actions
		case "gcp":
			return models.GCP, []models.ServiceAccountAction{
				models.ServiceAccountAction{
					Name:     models.GCPKeyDataAction,
					Resolved: false,
				},
			}
		}
	}

	if authInfo.Exec != nil {
		if authInfo.Exec.Command == "aws" || authInfo.Exec.Command == "aws-iam-authenticator" {
			return models.AWS, []models.ServiceAccountAction{
				models.ServiceAccountAction{
					Name:     models.AWSKeyDataAction,
					Resolved: false,
				},
			}
		}
	}

	if authInfo.Token != "" || authInfo.TokenFile != "" {
		if authInfo.Token == "" {
			return models.Bearer, []models.ServiceAccountAction{
				models.ServiceAccountAction{
					Name:     models.TokenDataAction,
					Resolved: false,
				},
			}
		}

		return models.Bearer, actions
	}

	if authInfo.Username != "" && authInfo.Password != "" {
		return models.Basic, actions
	}

	return models.NotAvailable, actions
}

// Parses the cluster object to determine actions -- only currently supported action is
// population of the cluster certificate authority data
func parseClusterForActions(cluster *api.Cluster) (actions []models.ServiceAccountAction) {
	actions = make([]models.ServiceAccountAction, 0)

	if cluster.CertificateAuthority != "" && len(cluster.CertificateAuthorityData) == 0 {
		return []models.ServiceAccountAction{
			models.ServiceAccountAction{
				Name:     models.ClusterCADataAction,
				Resolved: false,
			},
		}
	}

	return actions
}

// getKubeconfigForContext returns the raw kubeconfig associated with only a
// single context of the raw config
func getConfigForContext(
	rawConf *api.Config,
	contextName string,
) (*api.Config, error) {
	copyConf := rawConf.DeepCopy()

	copyConf.Clusters = make(map[string]*api.Cluster)
	copyConf.AuthInfos = make(map[string]*api.AuthInfo)
	copyConf.Contexts = make(map[string]*api.Context)
	copyConf.CurrentContext = contextName

	context, ok := rawConf.Contexts[contextName]

	if ok {
		userName := context.AuthInfo
		clusterName := context.Cluster
		authInfo, userFound := rawConf.AuthInfos[userName]
		cluster, clusterFound := rawConf.Clusters[clusterName]

		if userFound && clusterFound {
			copyConf.Clusters[clusterName] = cluster
			copyConf.AuthInfos[userName] = authInfo
			copyConf.Contexts[contextName] = context
		} else {
			return nil, errors.New("linked user and cluster not found")
		}
	} else {
		return nil, errors.New("context not found")
	}

	return copyConf, nil
}

// GetRestrictedClientConfigFromBytes returns a clientcmd.ClientConfig from a raw kubeconfig,
// a context name, and the set of allowed contexts.
func GetRestrictedClientConfigFromBytes(
	bytes []byte,
	contextName string,
	allowedContexts []string,
) (clientcmd.ClientConfig, error) {
	config, err := clientcmd.NewClientConfigFromBytes(bytes)

	if err != nil {
		return nil, err
	}

	rawConf, err := config.RawConfig()

	if err != nil {
		return nil, err
	}

	// grab a copy to get the pointer and set clusters, authinfos, and contexts to empty
	copyConf := rawConf.DeepCopy()

	copyConf.Clusters = make(map[string]*api.Cluster)
	copyConf.AuthInfos = make(map[string]*api.AuthInfo)
	copyConf.Contexts = make(map[string]*api.Context)
	copyConf.CurrentContext = contextName

	// put allowed clusters in a map
	aContextMap := CreateAllowedContextMap(allowedContexts)

	context, ok := rawConf.Contexts[contextName]

	if ok {
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
	err = clientcmd.Validate(*copyConf)

	if err != nil {
		return nil, err
	}

	clientConf := clientcmd.NewDefaultClientConfig(*copyConf, &clientcmd.ConfigOverrides{})

	return clientConf, nil
}

// GetContextsFromBytes converts a raw string to a set of Contexts
// by unmarshaling and calling toContexts
func GetContextsFromBytes(bytes []byte, allowedContexts []string) ([]models.Context, error) {
	config, err := clientcmd.NewClientConfigFromBytes(bytes)

	if err != nil {
		return nil, err
	}

	rawConf, err := config.RawConfig()

	if err != nil {
		return nil, err
	}

	err = clientcmd.Validate(rawConf)

	if err != nil {
		return nil, err
	}

	contexts := toContexts(&rawConf, allowedContexts)

	return contexts, nil
}

func toContexts(rawConf *api.Config, allowedContexts []string) []models.Context {
	contexts := make([]models.Context, 0)

	// put allowed clusters in map
	aContextMap := CreateAllowedContextMap(allowedContexts)

	// iterate through contexts and switch on selected
	for name, context := range rawConf.Contexts {
		_, isAllowed := aContextMap[name]
		_, userFound := rawConf.AuthInfos[context.AuthInfo]
		cluster, clusterFound := rawConf.Clusters[context.Cluster]

		if userFound && clusterFound && isAllowed {
			contexts = append(contexts, models.Context{
				Name:     name,
				Server:   cluster.Server,
				Cluster:  context.Cluster,
				User:     context.AuthInfo,
				Selected: true,
			})
		} else if userFound && clusterFound {
			contexts = append(contexts, models.Context{
				Name:     name,
				Server:   cluster.Server,
				Cluster:  context.Cluster,
				User:     context.AuthInfo,
				Selected: false,
			})
		}
	}

	return contexts
}

// CreateAllowedContextMap creates a dummy map from context name to context name
func CreateAllowedContextMap(contexts []string) map[string]string {
	aContextMap := make(map[string]string)

	for _, context := range contexts {
		aContextMap[context] = context
	}

	return aContextMap
}
