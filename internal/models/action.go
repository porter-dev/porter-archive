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
	AWSKeyDataAction            = "upload-aws-key-data"
)

// ServiceAccountAction is an action that must be resolved to set up
// a ServiceAccount
type ServiceAccountAction struct {
	gorm.Model

	// One of the constant action names
	Name     string `json:"name"`
	Resolved bool   `json:"resolved"`
}

// Externalize generates an external ServiceAccount to be shared over REST
func (u *ServiceAccountAction) Externalize() *ServiceAccountActionExternal {
	info := ServiceAccountActionInfos[u.Name]

	return &ServiceAccountActionExternal{
		Name:     u.Name,
		Resolved: u.Resolved,
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
	"upload-aws-key-data": ServiceAccountActionInfo{
		Name:   AWSKeyDataAction,
		Docs:   "https://github.com/porter-dev/porter",
		Fields: "aws_key_data",
	},
}
