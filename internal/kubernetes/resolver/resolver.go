package resolver

import (
	"encoding/base64"
	"errors"
	"net/url"
	"strings"

	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/kubernetes"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"k8s.io/client-go/tools/clientcmd/api"

	ints "github.com/porter-dev/porter/internal/models/integrations"
)

// CandidateResolver will resolve a cluster candidate to create a new cluster
type CandidateResolver struct {
	Resolver *types.ClusterResolverAll

	ClusterCandidateID uint
	ProjectID          uint
	UserID             uint

	// populated during the ResolveIntegration step
	integrationID    uint
	clusterCandidate *models.ClusterCandidate
	rawConf          *api.Config
}

// ResolveIntegration creates an integration in the DB
func (rcf *CandidateResolver) ResolveIntegration(
	repo repository.Repository,
) error {
	cc, err := repo.Cluster().ReadClusterCandidate(rcf.ProjectID, rcf.ClusterCandidateID)

	if err != nil {
		return err
	}

	rcf.clusterCandidate = cc

	rawConf, err := kubernetes.GetRawConfigFromBytes(cc.Kubeconfig)

	if err != nil {
		return err
	}

	rcf.rawConf = rawConf

	context := rawConf.Contexts[rawConf.CurrentContext]

	authInfoName := context.AuthInfo
	authInfo := rawConf.AuthInfos[authInfoName]

	// iterate through the resolvers, and use the ClusterResolverAll to populate
	// the required fields
	var id uint

	switch cc.AuthMechanism {
	case models.X509:
		id, err = rcf.resolveX509(repo, authInfo)
	case models.Bearer:
		id, err = rcf.resolveToken(repo, authInfo)
	case models.Basic:
		id, err = rcf.resolveBasic(repo, authInfo)
	case models.Local:
		id, err = rcf.resolveLocal(repo, authInfo)
	case models.OIDC:
		id, err = rcf.resolveOIDC(repo, authInfo)
	case models.GCP:
		id, err = rcf.resolveGCP(repo, authInfo)
	case models.AWS:
		id, err = rcf.resolveAWS(repo, authInfo)
	}

	if err != nil {
		return err
	}

	rcf.integrationID = id

	return nil
}

func (rcf *CandidateResolver) resolveX509(
	repo repository.Repository,
	authInfo *api.AuthInfo,
) (uint, error) {
	ki := &ints.KubeIntegration{
		Mechanism: ints.KubeX509,
		UserID:    rcf.UserID,
		ProjectID: rcf.ProjectID,
	}

	// attempt to construct cert and key from raw config
	if len(authInfo.ClientCertificateData) > 0 {
		ki.ClientCertificateData = authInfo.ClientCertificateData
	}

	if len(authInfo.ClientKeyData) > 0 {
		ki.ClientKeyData = authInfo.ClientKeyData
	}

	// override with resolver
	if rcf.Resolver.ClientCertData != "" {
		decoded, err := base64.StdEncoding.DecodeString(rcf.Resolver.ClientCertData)

		if err != nil {
			return 0, err
		}

		ki.ClientCertificateData = decoded
	}

	if rcf.Resolver.ClientKeyData != "" {
		decoded, err := base64.StdEncoding.DecodeString(rcf.Resolver.ClientKeyData)

		if err != nil {
			return 0, err
		}

		ki.ClientKeyData = decoded
	}

	// if resolvable, write kube integration to repo
	if len(ki.ClientCertificateData) == 0 || len(ki.ClientKeyData) == 0 {
		return 0, errors.New("could not resolve kube integration (x509)")
	}

	// return integration id if exists
	ki, err := repo.KubeIntegration().CreateKubeIntegration(ki)

	if err != nil {
		return 0, err
	}

	return ki.Model.ID, nil
}

func (rcf *CandidateResolver) resolveToken(
	repo repository.Repository,
	authInfo *api.AuthInfo,
) (uint, error) {
	ki := &ints.KubeIntegration{
		Mechanism: ints.KubeBearer,
		UserID:    rcf.UserID,
		ProjectID: rcf.ProjectID,
	}

	// attempt to construct token from raw config
	if len(authInfo.Token) > 0 {
		ki.Token = []byte(authInfo.Token)
	}

	// supplement with resolver
	if rcf.Resolver.TokenData != "" {
		ki.Token = []byte(rcf.Resolver.TokenData)
	}

	// if resolvable, write kube integration to repo
	if len(ki.Token) == 0 {
		return 0, errors.New("could not resolve kube integration (token)")
	}

	// return integration id if exists
	ki, err := repo.KubeIntegration().CreateKubeIntegration(ki)

	if err != nil {
		return 0, err
	}

	return ki.Model.ID, nil
}

func (rcf *CandidateResolver) resolveBasic(
	repo repository.Repository,
	authInfo *api.AuthInfo,
) (uint, error) {
	ki := &ints.KubeIntegration{
		Mechanism: ints.KubeBasic,
		UserID:    rcf.UserID,
		ProjectID: rcf.ProjectID,
	}

	if len(authInfo.Username) > 0 {
		ki.Username = []byte(authInfo.Username)
	}

	if len(authInfo.Password) > 0 {
		ki.Password = []byte(authInfo.Password)
	}

	if len(ki.Username) == 0 || len(ki.Password) == 0 {
		return 0, errors.New("could not resolve kube integration (basic)")
	}

	// return integration id if exists
	ki, err := repo.KubeIntegration().CreateKubeIntegration(ki)

	if err != nil {
		return 0, err
	}

	return ki.Model.ID, nil
}

func (rcf *CandidateResolver) resolveLocal(
	repo repository.Repository,
	authInfo *api.AuthInfo,
) (uint, error) {
	ki := &ints.KubeIntegration{
		Mechanism:  ints.KubeLocal,
		UserID:     rcf.UserID,
		ProjectID:  rcf.ProjectID,
		Kubeconfig: rcf.clusterCandidate.Kubeconfig,
	}

	// return integration id if exists
	ki, err := repo.KubeIntegration().CreateKubeIntegration(ki)

	if err != nil {
		return 0, err
	}

	return ki.Model.ID, nil
}

func (rcf *CandidateResolver) resolveOIDC(
	repo repository.Repository,
	authInfo *api.AuthInfo,
) (uint, error) {
	oidc := &ints.OIDCIntegration{
		Client:    ints.OIDCKube,
		UserID:    rcf.UserID,
		ProjectID: rcf.ProjectID,
	}

	if url, ok := authInfo.AuthProvider.Config["idp-issuer-url"]; ok {
		oidc.IssuerURL = []byte(url)
	}

	if clientID, ok := authInfo.AuthProvider.Config["client-id"]; ok {
		oidc.ClientID = []byte(clientID)
	}

	if clientSecret, ok := authInfo.AuthProvider.Config["client-secret"]; ok {
		oidc.ClientSecret = []byte(clientSecret)
	}

	if caData, ok := authInfo.AuthProvider.Config["idp-certificate-authority-data"]; ok {
		// based on the implementation, the oidc plugin expects the data to be base64 encoded,
		// which means we will not decode it here
		// reference: https://github.com/kubernetes/kubernetes/blob/9dfb4c876bfca7a5ae84259fae2bc337ed90c2d7/staging/src/k8s.io/client-go/plugin/pkg/client/auth/oidc/oidc.go#L135
		oidc.CertificateAuthorityData = []byte(caData)
	}

	if idToken, ok := authInfo.AuthProvider.Config["id-token"]; ok {
		oidc.IDToken = []byte(idToken)
	}

	if refreshToken, ok := authInfo.AuthProvider.Config["refresh-token"]; ok {
		oidc.RefreshToken = []byte(refreshToken)
	}

	// override with resolver
	if rcf.Resolver.OIDCIssuerCAData != "" {
		// based on the implementation, the oidc plugin expects the data to be base64 encoded,
		// which means we will not decode it here
		// reference: https://github.com/kubernetes/kubernetes/blob/9dfb4c876bfca7a5ae84259fae2bc337ed90c2d7/staging/src/k8s.io/client-go/plugin/pkg/client/auth/oidc/oidc.go#L135
		oidc.CertificateAuthorityData = []byte(rcf.Resolver.OIDCIssuerCAData)
	}

	// return integration id if exists
	oidc, err := repo.OIDCIntegration().CreateOIDCIntegration(oidc)

	if err != nil {
		return 0, err
	}

	return oidc.Model.ID, nil
}

func (rcf *CandidateResolver) resolveGCP(
	repo repository.Repository,
	authInfo *api.AuthInfo,
) (uint, error) {
	// TODO -- add GCP project ID and GCP email so that source is trackable
	gcp := &ints.GCPIntegration{
		UserID:    rcf.UserID,
		ProjectID: rcf.ProjectID,
	}

	// supplement with resolver
	if rcf.Resolver.GCPKeyData != "" {
		gcp.GCPKeyData = []byte(rcf.Resolver.GCPKeyData)
	}

	// throw error if no data
	if len(gcp.GCPKeyData) == 0 {
		return 0, errors.New("could not resolve gcp integration")
	}

	// return integration id if exists
	gcp, err := repo.GCPIntegration().CreateGCPIntegration(gcp)

	if err != nil {
		return 0, err
	}

	return gcp.Model.ID, nil
}

func (rcf *CandidateResolver) resolveAWS(
	repo repository.Repository,
	authInfo *api.AuthInfo,
) (uint, error) {
	// TODO -- add AWS session token as an optional param
	// TODO -- add AWS entity and user ARN
	aws := &ints.AWSIntegration{
		UserID:    rcf.UserID,
		ProjectID: rcf.ProjectID,
	}

	// override with resolver
	if rcf.Resolver.AWSClusterID != "" {
		aws.AWSClusterID = []byte(rcf.Resolver.AWSClusterID)
	}

	if rcf.Resolver.AWSAccessKeyID != "" {
		aws.AWSAccessKeyID = []byte(rcf.Resolver.AWSAccessKeyID)
	}

	if rcf.Resolver.AWSSecretAccessKey != "" {
		aws.AWSSecretAccessKey = []byte(rcf.Resolver.AWSSecretAccessKey)
	}

	// throw error if no data
	if len(aws.AWSClusterID) == 0 || len(aws.AWSAccessKeyID) == 0 || len(aws.AWSSecretAccessKey) == 0 {
		return 0, errors.New("could not resolve aws integration")
	}

	// return integration id if exists
	aws, err := repo.AWSIntegration().CreateAWSIntegration(aws)

	if err != nil {
		return 0, err
	}

	return aws.Model.ID, nil
}

// ResolveCluster writes a new cluster to the DB -- this must be called after
// rcf.ResolveIntegration, since it relies on the previously created integration.
func (rcf *CandidateResolver) ResolveCluster(
	repo repository.Repository,
) (*models.Cluster, error) {
	// build a cluster from the candidate
	cluster, err := rcf.buildCluster()

	if err != nil {
		return nil, err
	}

	// save cluster to db
	return repo.Cluster().CreateCluster(cluster)
}

func (rcf *CandidateResolver) buildCluster() (*models.Cluster, error) {
	rawConf := rcf.rawConf

	kcContext := rawConf.Contexts[rawConf.CurrentContext]

	kcAuthInfoName := kcContext.AuthInfo
	kcAuthInfo := rawConf.AuthInfos[kcAuthInfoName]

	kcClusterName := kcContext.Cluster
	kcCluster := rawConf.Clusters[kcClusterName]

	cc := rcf.clusterCandidate

	cluster := &models.Cluster{
		AuthMechanism:           cc.AuthMechanism,
		ProjectID:               cc.ProjectID,
		Name:                    cc.Name,
		Server:                  cc.Server,
		ClusterLocationOfOrigin: kcCluster.LocationOfOrigin,
		TLSServerName:           kcCluster.TLSServerName,
		InsecureSkipTLSVerify:   kcCluster.InsecureSkipTLSVerify,
		UserLocationOfOrigin:    kcAuthInfo.LocationOfOrigin,
		UserImpersonate:         kcAuthInfo.Impersonate,
	}

	if len(kcAuthInfo.ImpersonateGroups) > 0 {
		cluster.UserImpersonateGroups = strings.Join(kcAuthInfo.ImpersonateGroups, ",")
	}

	if len(kcCluster.CertificateAuthorityData) > 0 {
		cluster.CertificateAuthorityData = kcCluster.CertificateAuthorityData
	}

	if rcf.Resolver.ClusterCAData != "" {
		decoded, err := base64.StdEncoding.DecodeString(rcf.Resolver.ClusterCAData)

		// skip if decoding error
		if err != nil {
			return nil, err
		}

		cluster.CertificateAuthorityData = decoded
	}

	if rcf.Resolver.ClusterHostname != "" {
		serverURL, err := url.Parse(cluster.Server)
		if err != nil {
			return nil, err
		}

		if serverURL.Port() == "" {
			serverURL.Host = rcf.Resolver.ClusterHostname
		} else {
			serverURL.Host = rcf.Resolver.ClusterHostname + ":" + serverURL.Port()
		}

		cluster.Server = serverURL.String()
	}

	switch cc.AuthMechanism {
	case models.X509, models.Bearer, models.Basic, models.Local:
		cluster.KubeIntegrationID = rcf.integrationID
	case models.OIDC:
		cluster.OIDCIntegrationID = rcf.integrationID
	case models.GCP:
		cluster.GCPIntegrationID = rcf.integrationID
	case models.AWS:
		cluster.AWSIntegrationID = rcf.integrationID
	}

	return cluster, nil
}
