package local

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"

	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/provisioner/integrations/provisioner"
)

type LocalProvisioner struct {
	pc *LocalProvisionerConfig
}

type LocalProvisionerConfig struct {
	ProvisionerBackendURL   string
	LocalTerraformDirectory string
}

func NewLocalProvisioner(pc *LocalProvisionerConfig) *LocalProvisioner {
	// TODO: download matching porter-provisioner release, once ready
	return &LocalProvisioner{pc}
}

func (l *LocalProvisioner) Provision(opts *provisioner.ProvisionOpts) error {
	// TODO: allow cancellation -- this is just to simulate behavior
	go func() {
		cmdProv := exec.Command("porter-provisioner", string(opts.OperationKind))
		cmdProv.Stdout = os.Stdout
		cmdProv.Stderr = os.Stderr
		env, err := l.getEnv(opts)
		env = append(env, "PATH=/usr/local/bin:/usr/bin:/bin")

		if err != nil {
			fmt.Println(err)
		}

		cmdProv.Env = env

		err = cmdProv.Run()

		fmt.Println(err)
	}()

	return nil
}

func (l *LocalProvisioner) getEnv(opts *provisioner.ProvisionOpts) ([]string, error) {
	env := make([]string, 0)

	// marshal the values to JSON and base-64 encode them
	valBytes, err := json.Marshal(opts.Values)
	if err != nil {
		return nil, err
	}

	env = append(env, fmt.Sprintf("TF_DIR=%s", l.pc.LocalTerraformDirectory))
	env = append(env, fmt.Sprintf("TF_ORG_ID=%s", models.GetWorkspaceID(opts.Infra, opts.Operation)))
	env = append(env, fmt.Sprintf("TF_BACKEND_URL=%s", l.pc.ProvisionerBackendURL))
	env = append(env, fmt.Sprintf("CRED_EXCHANGE_ENDPOINT=%s", opts.CredentialExchange.CredExchangeEndpoint))
	env = append(env, fmt.Sprintf("CRED_EXCHANGE_ID=%d", opts.CredentialExchange.CredExchangeID))
	env = append(env, fmt.Sprintf("CRED_EXCHANGE_TOKEN=%s", opts.CredentialExchange.CredExchangeToken))
	env = append(env, fmt.Sprintf("VAULT_TOKEN=%s", opts.CredentialExchange.VaultToken))
	env = append(env, fmt.Sprintf("TF_VALUES=%s", base64.StdEncoding.EncodeToString(valBytes)))
	env = append(env, fmt.Sprintf("TF_KIND=%s", opts.Kind))

	return env, nil
}
