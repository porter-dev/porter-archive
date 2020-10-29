package models

// ServiceAccountAction is an action that needs to be performed to set up
// a service account
type ServiceAccountAction struct {
	Name string `json:"name"`
	Docs string `json:"docs"`

	// a comma-separated list of required fields to send in an action request
	Fields string `json:"fields"`
}

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

// ServiceAccountsActions are actions must be performed to initialize a
// ServiceAccount
var ServiceAccountsActions = map[string]ServiceAccountAction{
	"upload-cluster-ca-data": ServiceAccountAction{
		Name:   ClusterCADataAction,
		Docs:   "https://github.com/porter-dev/porter",
		Fields: "cluster_ca_data",
	},
	"upload-client-cert-data": ServiceAccountAction{
		Name:   ClientCertDataAction,
		Docs:   "https://github.com/porter-dev/porter",
		Fields: "client_cert_data",
	},
	"upload-client-key-data": ServiceAccountAction{
		Name:   ClientKeyDataAction,
		Docs:   "https://github.com/porter-dev/porter",
		Fields: "client_key_data",
	},
	"upload-oidc-idp-issuer-ca-data": ServiceAccountAction{
		Name:   OIDCIssuerDataAction,
		Docs:   "https://github.com/porter-dev/porter",
		Fields: "oidc_idp_issuer_ca_data",
	},
	"upload-token-data": ServiceAccountAction{
		Name:   TokenDataAction,
		Docs:   "https://github.com/porter-dev/porter",
		Fields: "token_data",
	},
	"upload-gcp-key-data": ServiceAccountAction{
		Name:   GCPKeyDataAction,
		Docs:   "https://github.com/porter-dev/porter",
		Fields: "gcp_key_data",
	},
	"upload-aws-key-data": ServiceAccountAction{
		Name:   AWSKeyDataAction,
		Docs:   "https://github.com/porter-dev/porter",
		Fields: "aws_key_data",
	},
}
