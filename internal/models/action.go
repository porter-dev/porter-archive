package models

import "gorm.io/gorm"

// Action names
const (
	ClusterCADataAction  string = "upload-cluster-ca-data"
	ClientCertDataAction        = "upload-client-cert-data"
	ClientKeyDataAction         = "upload-client-key-data"
	OIDCIssuerDataAction        = "upload-oidc-idp-issuer-ca-data"
	TokenDataAction             = "upload-token-data"
	GCPKeyDataAction            = "upload-gcp-key-data"
	AWSDataAction               = "upload-aws-data"
)

// ServiceAccountAction is an action that must be resolved to set up
// a ServiceAccount
type ServiceAccountAction struct {
	gorm.Model

	ServiceAccountCandidateID uint

	// One of the constant action names
	Name     string `json:"name"`
	Resolved bool   `json:"resolved"`

	// Filename is an optional filename, if the action requires
	// data populated from a local file
	Filename string `json:"filename,omitempty"`
}

// Externalize generates an external ServiceAccount to be shared over REST
func (u *ServiceAccountAction) Externalize() *ServiceAccountActionExternal {
	info := ServiceAccountActionInfos[u.Name]

	return &ServiceAccountActionExternal{
		Name:     u.Name,
		Resolved: u.Resolved,
		Filename: u.Filename,
		Docs:     info.Docs,
		Fields:   info.Fields,
	}
}

// ServiceAccountActionExternal is an external ServiceAccountAction to be
// sent over REST
type ServiceAccountActionExternal struct {
	Name     string `json:"name"`
	Docs     string `json:"docs"`
	Resolved bool   `json:"resolved"`
	Fields   string `json:"fields"`
	Filename string `json:"filename,omitempty"`
}

// ServiceAccountAllActions is a helper type that contains the fields for
// all possible actions, so that raw bytes can be unmarshaled in a single
// read
type ServiceAccountAllActions struct {
	Name string `json:"name"`

	ClusterCAData      string `json:"cluster_ca_data,omitempty"`
	ClientCertData     string `json:"client_cert_data,omitempty"`
	ClientKeyData      string `json:"client_key_data,omitempty"`
	OIDCIssuerCAData   string `json:"oidc_idp_issuer_ca_data,omitempty"`
	TokenData          string `json:"token_data,omitempty"`
	GCPKeyData         string `json:"gcp_key_data,omitempty"`
	AWSAccessKeyID     string `json:"aws_access_key_id"`
	AWSSecretAccessKey string `json:"aws_secret_access_key"`
	AWSClusterID       string `json:"aws_cluster_id"`
}

// ServiceAccountActionInfo contains the information for actions to be
// performed in order to initialize a ServiceAccount
type ServiceAccountActionInfo struct {
	Name string `json:"name"`
	Docs string `json:"docs"`

	// a comma-separated list of required fields to send in an action request
	Fields string `json:"fields"`
}

// ServiceAccountActionInfos contain the information for actions to be
// performed in order to initialize a ServiceAccount
var ServiceAccountActionInfos = map[string]ServiceAccountActionInfo{
	"upload-cluster-ca-data": ServiceAccountActionInfo{
		Name:   ClusterCADataAction,
		Docs:   "https://github.com/porter-dev/porter",
		Fields: "cluster_ca_data",
	},
	"upload-client-cert-data": ServiceAccountActionInfo{
		Name:   ClientCertDataAction,
		Docs:   "https://github.com/porter-dev/porter",
		Fields: "client_cert_data",
	},
	"upload-client-key-data": ServiceAccountActionInfo{
		Name:   ClientKeyDataAction,
		Docs:   "https://github.com/porter-dev/porter",
		Fields: "client_key_data",
	},
	"upload-oidc-idp-issuer-ca-data": ServiceAccountActionInfo{
		Name:   OIDCIssuerDataAction,
		Docs:   "https://github.com/porter-dev/porter",
		Fields: "oidc_idp_issuer_ca_data",
	},
	"upload-token-data": ServiceAccountActionInfo{
		Name:   TokenDataAction,
		Docs:   "https://github.com/porter-dev/porter",
		Fields: "token_data",
	},
	"upload-gcp-key-data": ServiceAccountActionInfo{
		Name:   GCPKeyDataAction,
		Docs:   "https://github.com/porter-dev/porter",
		Fields: "gcp_key_data",
	},
	"upload-aws-data": ServiceAccountActionInfo{
		Name:   AWSDataAction,
		Docs:   "https://github.com/porter-dev/porter",
		Fields: "aws_access_key_id,aws_secret_access_key,aws_cluster_id",
	},
}
