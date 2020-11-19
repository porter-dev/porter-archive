package kubernetes

import (
	"context"
	"errors"
	"net/url"
	"strings"

	"github.com/porter-dev/porter/internal/models"
	"golang.org/x/oauth2/google"
	"k8s.io/client-go/tools/clientcmd"
	"k8s.io/client-go/tools/clientcmd/api"

	"github.com/aws/aws-sdk-go/aws"

	"github.com/aws/aws-sdk-go/aws/credentials"
	"github.com/aws/aws-sdk-go/aws/session"
	token "sigs.k8s.io/aws-iam-authenticator/pkg/token"
)

// GetServiceAccountCandidates parses a kubeconfig for a list of service account
// candidates.
//
// The local boolean represents whether the auth mechanism should be designated as
// "local": if so, the auth mechanism uses local plugins/mechanisms purely from the
// kubeconfig.
func GetServiceAccountCandidates(kubeconfig []byte, local bool) ([]*models.ServiceAccountCandidate, error) {
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
		awsClusterID := ""
		authInfoName := context.AuthInfo

		actions := make([]models.ServiceAccountAction, 0)
		var integration string

		if local {
			integration = models.Local
		} else {
			// get the auth mechanism and actions
			integration, actions = parseAuthInfoForActions(rawConf.AuthInfos[authInfoName])
			clusterActions := parseClusterForActions(rawConf.Clusters[clusterName])
			actions = append(actions, clusterActions...)

			// if auth mechanism is unsupported, we'll skip it
			if integration == models.NotAvailable {
				continue
			} else if integration == models.AWS {
				// if the auth mechanism is AWS, we need to parse more explicitly
				// for the cluster id
				awsClusterID = parseAuthInfoForAWSClusterID(rawConf.AuthInfos[authInfoName], clusterName)
			}
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
				Actions:           actions,
				Kind:              "connector",
				ContextName:       contextName,
				ClusterName:       clusterName,
				ClusterEndpoint:   rawConf.Clusters[clusterName].Server,
				Integration:     integration,
				AWSClusterIDGuess: awsClusterID,
				Kubeconfig:        rawBytes,
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
func parseAuthInfoForActions(authInfo *api.AuthInfo) (integration string, actions []models.ServiceAccountAction) {
	actions = make([]models.ServiceAccountAction, 0)

	if (authInfo.ClientCertificate != "" || len(authInfo.ClientCertificateData) != 0) &&
		(authInfo.ClientKey != "" || len(authInfo.ClientKeyData) != 0) {
		if len(authInfo.ClientCertificateData) == 0 {
			actions = append(actions, models.ServiceAccountAction{
				Name:     models.ClientCertDataAction,
				Resolved: false,
				Filename: authInfo.ClientCertificate,
			})
		}

		if len(authInfo.ClientKeyData) == 0 {
			actions = append(actions, models.ServiceAccountAction{
				Name:     models.ClientKeyDataAction,
				Resolved: false,
				Filename: authInfo.ClientKey,
			})
		}

		return models.X509, actions
	}

	if authInfo.AuthProvider != nil {
		switch authInfo.AuthProvider.Name {
		case "oidc":
			filename, isFile := authInfo.AuthProvider.Config["idp-certificate-authority"]
			data, isData := authInfo.AuthProvider.Config["idp-certificate-authority-data"]

			if isFile && (!isData || data == "") {
				return models.OIDC, []models.ServiceAccountAction{
					models.ServiceAccountAction{
						Name:     models.OIDCIssuerDataAction,
						Resolved: false,
						Filename: filename,
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
					Name:     models.AWSDataAction,
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
					Filename: authInfo.TokenFile,
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
		actions = append(actions, models.ServiceAccountAction{
			Name:     models.ClusterCADataAction,
			Resolved: false,
			Filename: cluster.CertificateAuthority,
		})
	}

	serverURL, err := url.Parse(cluster.Server)

	if err == nil {
		if hostname := serverURL.Hostname(); hostname == "127.0.0.1" || hostname == "localhost" {
			actions = append(actions, models.ServiceAccountAction{
				Name:     models.ClusterLocalhostAction,
				Resolved: false,
			})
		}
	}

	return actions
}

func parseAuthInfoForAWSClusterID(authInfo *api.AuthInfo, fallback string) string {
	if authInfo.Exec != nil {
		if authInfo.Exec.Command == "aws" {
			// look for --cluster-name flag
			for i, arg := range authInfo.Exec.Args {
				if arg == "--cluster-name" && len(authInfo.Exec.Args) > i+1 {
					return authInfo.Exec.Args[i+1]
				}
			}
		} else if authInfo.Exec.Command == "aws-iam-authenticator" {
			// look for -i or --cluster-id flag
			for i, arg := range authInfo.Exec.Args {
				if (arg == "-i" || arg == "--cluster-id") && len(authInfo.Exec.Args) > i+1 {
					return authInfo.Exec.Args[i+1]
				}
			}
		}
	}

	return fallback
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

// GetClientConfigFromServiceAccount will construct new clientcmd.ClientConfig using
// the configuration saved within a ServiceAccount model
func GetClientConfigFromServiceAccount(
	sa *models.ServiceAccount,
	clusterID uint,
	updateTokenCache UpdateTokenCacheFunc,
) (clientcmd.ClientConfig, error) {
	if sa.Integration == models.Local {
		return clientcmd.NewClientConfigFromBytes(sa.Kubeconfig)
	}

	apiConfig, err := createRawConfigFromServiceAccount(sa, clusterID, updateTokenCache)

	if err != nil {
		return nil, err
	}

	config := clientcmd.NewDefaultClientConfig(*apiConfig, &clientcmd.ConfigOverrides{})

	return config, nil
}

func createRawConfigFromServiceAccount(
	sa *models.ServiceAccount,
	clusterID uint,
	updateTokenCache UpdateTokenCacheFunc,
) (*api.Config, error) {
	apiConfig := &api.Config{}

	var cluster *models.Cluster = nil

	// find the cluster within the ServiceAccount configuration
	for _, _cluster := range sa.Clusters {
		if _cluster.ID == clusterID {
			cluster = &_cluster
		}
	}

	if cluster == nil {
		return nil, errors.New("cluster not found")
	}

	clusterMap := make(map[string]*api.Cluster)

	clusterMap[cluster.Name] = &api.Cluster{
		LocationOfOrigin:         cluster.LocationOfOrigin,
		Server:                   cluster.Server,
		TLSServerName:            cluster.TLSServerName,
		InsecureSkipTLSVerify:    cluster.InsecureSkipTLSVerify,
		CertificateAuthorityData: cluster.CertificateAuthorityData,
	}

	// construct the auth infos
	authInfoName := cluster.Name + "-" + sa.Integration

	authInfoMap := make(map[string]*api.AuthInfo)

	authInfoMap[authInfoName] = &api.AuthInfo{
		LocationOfOrigin: sa.LocationOfOrigin,
		Impersonate:      sa.Impersonate,
	}

	if groups := strings.Split(sa.ImpersonateGroups, ","); len(groups) > 0 && groups[0] != "" {
		authInfoMap[authInfoName].ImpersonateGroups = groups
	}

	switch sa.Integration {
	case models.X509:
		authInfoMap[authInfoName].ClientCertificateData = sa.ClientCertificateData
		authInfoMap[authInfoName].ClientKeyData = sa.ClientKeyData
	case models.Basic:
		authInfoMap[authInfoName].Username = string(sa.Username)
		authInfoMap[authInfoName].Password = string(sa.Password)
	case models.Bearer:
		authInfoMap[authInfoName].Token = string(sa.Token)
	case models.OIDC:
		authInfoMap[authInfoName].AuthProvider = &api.AuthProviderConfig{
			Name: "oidc",
			Config: map[string]string{
				"idp-issuer-url":                 string(sa.OIDCIssuerURL),
				"client-id":                      string(sa.OIDCClientID),
				"client-secret":                  string(sa.OIDCClientSecret),
				"idp-certificate-authority-data": string(sa.OIDCCertificateAuthorityData),
				"id-token":                       string(sa.OIDCIDToken),
				"refresh-token":                  string(sa.OIDCRefreshToken),
			},
		}
	case models.GCP:
		tok, err := getGCPToken(sa, updateTokenCache)

		if err != nil {
			return nil, err
		}

		// add this as a bearer token
		authInfoMap[authInfoName].Token = tok
	case models.AWS:
		tok, err := getAWSToken(sa, updateTokenCache)

		if err != nil {
			return nil, err
		}

		// add this as a bearer token
		authInfoMap[authInfoName].Token = tok
	default:
		return nil, errors.New("not a supported auth mechanism")
	}

	// create a context of the cluster name
	contextMap := make(map[string]*api.Context)

	contextMap[cluster.Name] = &api.Context{
		LocationOfOrigin: cluster.LocationOfOrigin,
		Cluster:          cluster.Name,
		AuthInfo:         authInfoName,
	}

	apiConfig.Clusters = clusterMap
	apiConfig.AuthInfos = authInfoMap
	apiConfig.Contexts = contextMap
	apiConfig.CurrentContext = cluster.Name

	return apiConfig, nil
}

func getGCPToken(
	sa *models.ServiceAccount,
	updateTokenCache UpdateTokenCacheFunc,
) (string, error) {
	// check the token cache for a non-expired token
	if tok := sa.TokenCache.Token; !sa.TokenCache.IsExpired() && len(tok) > 0 {
		return string(tok), nil
	}

	creds, err := google.CredentialsFromJSON(
		context.Background(),
		sa.GCPKeyData,
		"https://www.googleapis.com/auth/cloud-platform",
	)

	if err != nil {
		return "", err
	}

	tok, err := creds.TokenSource.Token()

	if err != nil {
		return "", err
	}

	// update the token cache
	updateTokenCache(tok.AccessToken, tok.Expiry)

	return tok.AccessToken, nil
}

func getAWSToken(
	sa *models.ServiceAccount,
	updateTokenCache UpdateTokenCacheFunc,
) (string, error) {
	// check the token cache for a non-expired token
	if tok := sa.TokenCache.Token; !sa.TokenCache.IsExpired() && len(tok) > 0 {
		return string(tok), nil
	}

	generator, err := token.NewGenerator(false, false)

	if err != nil {
		return "", err
	}

	sess, err := session.NewSessionWithOptions(session.Options{
		SharedConfigState: session.SharedConfigEnable,
		Config: aws.Config{
			Credentials: credentials.NewStaticCredentials(
				string(sa.AWSAccessKeyID),
				string(sa.AWSSecretAccessKey),
				"",
			),
		},
	})

	if err != nil {
		return "", err
	}

	tok, err := generator.GetWithOptions(&token.GetTokenOptions{
		Session:   sess,
		ClusterID: string(sa.AWSClusterID),
	})

	if err != nil {
		return "", err
	}

	updateTokenCache(tok.Token, tok.Expiration)

	return tok.Token, nil
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
