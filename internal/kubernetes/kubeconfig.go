package kubernetes

import (
	"encoding/json"
	"errors"
	"net/url"

	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"k8s.io/client-go/tools/clientcmd"
	"k8s.io/client-go/tools/clientcmd/api"
)

// GetClusterCandidatesFromKubeconfig parses a kubeconfig for a list of cluster
// candidates.
//
// The local boolean represents whether the auth mechanism should be designated as
// "local": if so, the auth mechanism uses local plugins/mechanisms purely from the
// kubeconfig.
func GetClusterCandidatesFromKubeconfig(
	kubeconfig []byte,
	projectID uint,
	local bool,
) ([]*models.ClusterCandidate, error) {
	config, err := clientcmd.NewClientConfigFromBytes(kubeconfig)

	if err != nil {
		return nil, err
	}

	rawConf, err := config.RawConfig()

	if err != nil {
		return nil, err
	}

	res := make([]*models.ClusterCandidate, 0)

	for contextName, context := range rawConf.Contexts {
		clusterName := context.Cluster
		awsClusterID := ""
		authInfoName := context.AuthInfo

		resolvers := make([]models.ClusterResolver, 0)
		var authMechanism models.ClusterAuth

		if local {
			authMechanism = models.Local
		} else {
			// get the resolvers, if needed
			authMechanism, resolvers = parseAuthInfoForResolvers(rawConf.AuthInfos[authInfoName])
			clusterResolvers := parseClusterForResolvers(rawConf.Clusters[clusterName])
			resolvers = append(resolvers, clusterResolvers...)

			if authMechanism == models.AWS {
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
			// create the candidate cluster
			res = append(res, &models.ClusterCandidate{
				AuthMechanism:     authMechanism,
				ProjectID:         projectID,
				Resolvers:         resolvers,
				ContextName:       contextName,
				Name:              clusterName,
				Server:            rawConf.Clusters[clusterName].Server,
				AWSClusterIDGuess: []byte(awsClusterID),
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
func parseAuthInfoForResolvers(authInfo *api.AuthInfo) (authMechanism models.ClusterAuth, resolvers []models.ClusterResolver) {
	resolvers = make([]models.ClusterResolver, 0)

	if (authInfo.ClientCertificate != "" || len(authInfo.ClientCertificateData) != 0) &&
		(authInfo.ClientKey != "" || len(authInfo.ClientKeyData) != 0) {
		if len(authInfo.ClientCertificateData) == 0 {
			fn := map[string]string{
				"filename": authInfo.ClientCertificate,
			}

			fnBytes, _ := json.Marshal(&fn)

			resolvers = append(resolvers, models.ClusterResolver{
				Name:     types.ClientCertData,
				Resolved: false,
				Data:     fnBytes,
			})
		}

		if len(authInfo.ClientKeyData) == 0 {
			fn := map[string]string{
				"filename": authInfo.ClientKey,
			}

			fnBytes, _ := json.Marshal(&fn)

			resolvers = append(resolvers, models.ClusterResolver{
				Name:     types.ClientKeyData,
				Resolved: false,
				Data:     fnBytes,
			})
		}

		return models.X509, resolvers
	}

	if authInfo.AuthProvider != nil {
		switch authInfo.AuthProvider.Name {
		case "oidc":
			filename, isFile := authInfo.AuthProvider.Config["idp-certificate-authority"]
			data, isData := authInfo.AuthProvider.Config["idp-certificate-authority-data"]

			if isFile && (!isData || data == "") {
				fn := map[string]string{
					"filename": filename,
				}

				fnBytes, _ := json.Marshal(&fn)

				return models.OIDC, []models.ClusterResolver{
					{
						Name:     types.OIDCIssuerData,
						Resolved: false,
						Data:     fnBytes,
					},
				}
			}

			return models.OIDC, resolvers
		case "gcp":
			return models.GCP, []models.ClusterResolver{
				{
					Name:     types.GCPKeyData,
					Resolved: false,
				},
			}
		}
	}

	if authInfo.Exec != nil {
		if authInfo.Exec.Command == "aws" || authInfo.Exec.Command == "aws-iam-authenticator" {
			return models.AWS, []models.ClusterResolver{
				{
					Name:     types.AWSData,
					Resolved: false,
				},
			}
		}
	}

	if authInfo.Token != "" || authInfo.TokenFile != "" {
		if authInfo.Token == "" {
			fn := map[string]string{
				"filename": authInfo.TokenFile,
			}

			fnBytes, _ := json.Marshal(&fn)

			return models.Bearer, []models.ClusterResolver{
				{
					Name:     types.TokenData,
					Resolved: false,
					Data:     fnBytes,
				},
			}
		}

		return models.Bearer, resolvers
	}

	if authInfo.Username != "" && authInfo.Password != "" {
		return models.Basic, resolvers
	}

	return models.X509, resolvers
}

// Parses the cluster object to determine resolvers -- only currently supported resolver is
// population of the cluster certificate authority data
func parseClusterForResolvers(cluster *api.Cluster) (resolvers []models.ClusterResolver) {
	resolvers = make([]models.ClusterResolver, 0)

	if cluster.CertificateAuthority != "" && len(cluster.CertificateAuthorityData) == 0 {
		fn := map[string]string{
			"filename": cluster.CertificateAuthority,
		}

		fnBytes, _ := json.Marshal(&fn)

		resolvers = append(resolvers, models.ClusterResolver{
			Name:     types.ClusterCAData,
			Resolved: false,
			Data:     fnBytes,
		})
	}

	serverURL, err := url.Parse(cluster.Server)

	if err == nil {
		if hostname := serverURL.Hostname(); hostname == "127.0.0.1" || hostname == "localhost" {
			resolvers = append(resolvers, models.ClusterResolver{
				Name:     types.ClusterLocalhost,
				Resolved: false,
			})
		}
	}

	return resolvers
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

// getConfigForContext returns the raw kubeconfig associated with only a
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

// CreateAllowedContextMap creates a dummy map from context name to context name
func CreateAllowedContextMap(contexts []string) map[string]string {
	aContextMap := make(map[string]string)

	for _, context := range contexts {
		aContextMap[context] = context
	}

	return aContextMap
}
