package forms

import (
	"encoding/base64"

	"github.com/porter-dev/porter/internal/kubernetes"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
)

// ActionResolver exposes an interface for resolving an action as a ServiceAccount.
// So that actions can be chained together, a pointer to a serviceAccount can be
// used -- if this points to nil, a new service account is created
type ActionResolver interface {
	PopulateServiceAccount(repo repository.ServiceAccountRepository) error
}

// ServiceAccountActionResolver is the base type for resolving a ServiceAccountAction
// that belongs to a given ServiceAccountCandidate
type ServiceAccountActionResolver struct {
	ServiceAccountCandidateID uint `json:"sa_candidate_id" form:"required"`
	SA                        *models.ServiceAccount
	SACandidate               *models.ServiceAccountCandidate
}

// PopulateServiceAccount will create a service account if it does not exist,
// or will append a new cluster given by a ServiceAccountCandidate to the
// ServiceAccount
func (sar *ServiceAccountActionResolver) PopulateServiceAccount(
	repo repository.ServiceAccountRepository,
) error {
	var err error
	id := sar.ServiceAccountCandidateID

	if sar.SACandidate == nil {
		sar.SACandidate, err = repo.ReadServiceAccountCandidate(id)

		if err != nil {
			return err
		}
	}

	rawConf, err := kubernetes.GetRawConfigFromBytes(sar.SACandidate.Kubeconfig)

	if err != nil {
		return err
	}

	context := rawConf.Contexts[rawConf.CurrentContext]

	authInfoName := context.AuthInfo
	authInfo := rawConf.AuthInfos[authInfoName]

	clusterName := context.Cluster
	cluster := rawConf.Clusters[clusterName]

	modelCluster := models.Cluster{
		Name:                  clusterName,
		LocationOfOrigin:      cluster.LocationOfOrigin,
		Server:                cluster.Server,
		TLSServerName:         cluster.TLSServerName,
		InsecureSkipTLSVerify: cluster.InsecureSkipTLSVerify,
	}

	if len(cluster.CertificateAuthorityData) > 0 {
		modelCluster.CertificateAuthorityData = cluster.CertificateAuthorityData
	}

	if sar.SA == nil {
		sar.SA = &models.ServiceAccount{
			ProjectID:         sar.SACandidate.ProjectID,
			Kind:              sar.SACandidate.Kind,
			Clusters:          []models.Cluster{modelCluster},
			AuthMechanism:     sar.SACandidate.AuthMechanism,
			LocationOfOrigin:  authInfo.LocationOfOrigin,
			Impersonate:       authInfo.Impersonate,
			ImpersonateGroups: authInfo.ImpersonateGroups,
		}
	} else {
		doesClusterExist := false

		for _, cluster := range sar.SA.Clusters {
			if cluster.Name == sar.SACandidate.ClusterName && cluster.Server == sar.SACandidate.ClusterEndpoint {
				doesClusterExist = true
			}
		}

		if !doesClusterExist {
			sar.SA.Clusters = append(sar.SA.Clusters, modelCluster)
		}
	}

	if len(authInfo.ClientCertificateData) > 0 {
		sar.SA.ClientCertificateData = authInfo.ClientCertificateData
	}

	if len(authInfo.ClientKeyData) > 0 {
		sar.SA.ClientKeyData = authInfo.ClientKeyData
	}

	if authInfo.Token != "" {
		sar.SA.Token = authInfo.Token
	}

	if authInfo.Username != "" {
		sar.SA.Username = authInfo.Username
	}

	if authInfo.Password != "" {
		sar.SA.Password = authInfo.Password
	}

	if authInfo.AuthProvider != nil && authInfo.AuthProvider.Name == "oidc" {
		if url, ok := authInfo.AuthProvider.Config["idp-issuer-url"]; ok {
			sar.SA.OIDCIssuerURL = url
		}

		if clientID, ok := authInfo.AuthProvider.Config["client-id"]; ok {
			sar.SA.OIDCClientID = clientID
		}

		if clientSecret, ok := authInfo.AuthProvider.Config["client-secret"]; ok {
			sar.SA.OIDCClientSecret = clientSecret
		}

		if caData, ok := authInfo.AuthProvider.Config["idp-certificate-authority-data"]; ok {
			sar.SA.OIDCCertificateAuthorityData = []byte(caData)
		}

		if idToken, ok := authInfo.AuthProvider.Config["id-token"]; ok {
			sar.SA.OIDCIDToken = idToken
		}

		if refreshToken, ok := authInfo.AuthProvider.Config["refresh-token"]; ok {
			sar.SA.OIDCRefreshToken = refreshToken
		}
	}

	return nil
}

// ClusterCADataAction contains the base64 encoded cluster CA data
type ClusterCADataAction struct {
	*ServiceAccountActionResolver
	ClusterCAData string `json:"cluster_ca_data" form:"required"`
}

// PopulateServiceAccount will add cluster ca data to a cluster in the ServiceAccount's
// list of clusters
func (cda *ClusterCADataAction) PopulateServiceAccount(
	repo repository.ServiceAccountRepository,
) error {
	err := cda.ServiceAccountActionResolver.PopulateServiceAccount(repo)

	if err != nil {
		return err
	}

	saCandidate := cda.ServiceAccountActionResolver.SACandidate

	for i, cluster := range cda.ServiceAccountActionResolver.SA.Clusters {
		if cluster.Name == saCandidate.ClusterName && cluster.Server == saCandidate.ClusterEndpoint {
			decoded, err := base64.StdEncoding.DecodeString(cda.ClusterCAData)

			// skip if decoding error
			if err != nil {
				return err
			}

			(&cluster).CertificateAuthorityData = decoded
			cda.ServiceAccountActionResolver.SA.Clusters[i] = cluster
		}
	}

	return nil
}

// ClientCertDataAction contains the base64 encoded cluster cert data
type ClientCertDataAction struct {
	*ServiceAccountActionResolver
	ClientCertData string `json:"client_cert_data" form:"required"`
}

// PopulateServiceAccount will add client CA data to a ServiceAccount
func (ccda *ClientCertDataAction) PopulateServiceAccount(
	repo repository.ServiceAccountRepository,
) error {
	err := ccda.ServiceAccountActionResolver.PopulateServiceAccount(repo)

	if err != nil {
		return err
	}

	decoded, err := base64.StdEncoding.DecodeString(ccda.ClientCertData)

	// skip if decoding error
	if err != nil {
		return err
	}

	ccda.ServiceAccountActionResolver.SA.ClientCertificateData = decoded

	return nil
}

// ClientKeyDataAction contains the base64 encoded cluster key data
type ClientKeyDataAction struct {
	*ServiceAccountActionResolver
	ClientKeyData string `json:"client_key_data" form:"required"`
}

// PopulateServiceAccount will add client CA data to a ServiceAccount
func (ckda *ClientKeyDataAction) PopulateServiceAccount(
	repo repository.ServiceAccountRepository,
) error {
	err := ckda.ServiceAccountActionResolver.PopulateServiceAccount(repo)

	if err != nil {
		return err
	}

	decoded, err := base64.StdEncoding.DecodeString(ckda.ClientKeyData)

	// skip if decoding error
	if err != nil {
		return err
	}

	ckda.ServiceAccountActionResolver.SA.ClientKeyData = decoded

	return nil
}

// OIDCIssuerDataAction contains the base64 encoded IDP issuer CA data
type OIDCIssuerDataAction struct {
	*ServiceAccountActionResolver
	OIDCIssuerCAData string `json:"oidc_idp_issuer_ca_data" form:"required"`
}

// PopulateServiceAccount will add OIDC issuer CA data to a ServiceAccount
func (oida *OIDCIssuerDataAction) PopulateServiceAccount(
	repo repository.ServiceAccountRepository,
) error {
	err := oida.ServiceAccountActionResolver.PopulateServiceAccount(repo)

	if err != nil {
		return err
	}

	decoded, err := base64.StdEncoding.DecodeString(oida.OIDCIssuerCAData)

	// skip if decoding error
	if err != nil {
		return err
	}

	oida.ServiceAccountActionResolver.SA.OIDCCertificateAuthorityData = decoded

	return nil
}

// TokenDataAction contains the token data to use
type TokenDataAction struct {
	*ServiceAccountActionResolver
	TokenData string `json:"token_data" form:"required"`
}

// PopulateServiceAccount will add bearer token data to a ServiceAccount
func (tda *TokenDataAction) PopulateServiceAccount(
	repo repository.ServiceAccountRepository,
) error {
	err := tda.ServiceAccountActionResolver.PopulateServiceAccount(repo)

	if err != nil {
		return err
	}

	tda.ServiceAccountActionResolver.SA.Token = tda.TokenData

	return nil
}

// GCPKeyDataAction contains the GCP key data
type GCPKeyDataAction struct {
	*ServiceAccountActionResolver
	GCPKeyData string `json:"gcp_key_data" form:"required"`
}

// PopulateServiceAccount will add GCP key data to a ServiceAccount
func (gkda *GCPKeyDataAction) PopulateServiceAccount(
	repo repository.ServiceAccountRepository,
) error {
	err := gkda.ServiceAccountActionResolver.PopulateServiceAccount(repo)

	if err != nil {
		return err
	}

	gkda.ServiceAccountActionResolver.SA.KeyData = []byte(gkda.GCPKeyData)

	return nil
}

// AWSKeyDataAction contains the AWS key data
type AWSKeyDataAction struct {
	*ServiceAccountActionResolver
	AWSKeyData string `json:"aws_key_data" form:"required"`
}

// PopulateServiceAccount will add GCP key data to a ServiceAccount
func (akda *AWSKeyDataAction) PopulateServiceAccount(
	repo repository.ServiceAccountRepository,
) error {
	err := akda.ServiceAccountActionResolver.PopulateServiceAccount(repo)

	if err != nil {
		return err
	}

	akda.ServiceAccountActionResolver.SA.KeyData = []byte(akda.AWSKeyData)

	return nil
}
