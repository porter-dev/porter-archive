package provisioner

import (
	"github.com/porter-dev/porter/internal/models"
)

type ProvisionerOperation string

const (
	Apply   ProvisionerOperation = "apply"
	Destroy ProvisionerOperation = "destroy"
)

type ProvisionCredentialExchange struct {
	CredExchangeEndpoint string
	CredExchangeToken    string
	CredExchangeID       uint

	VaultToken string
}

type ProvisionOpts struct {
	Infra              *models.Infra
	Operation          *models.Operation
	CredentialExchange *ProvisionCredentialExchange
	OperationKind      ProvisionerOperation
	Kind               string
	Values             map[string]interface{}
}

type Provisioner interface {
	Provision(opts *ProvisionOpts) error
}
