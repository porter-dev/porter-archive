//go:build ee
// +build ee

package config

import (
	"github.com/porter-dev/porter/ee/integrations/vault"
)

func init() {
	sharedInit()

	var key [32]byte

	for i, b := range []byte(InstanceEnvConf.DBConf.EncryptionKey) {
		key[i] = b
	}

	if InstanceEnvConf.DBConf.VaultAPIKey != "" && InstanceEnvConf.DBConf.VaultServerURL != "" && InstanceEnvConf.DBConf.VaultPrefix != "" {
		InstanceCredentialBackend = vault.NewClient(
			InstanceEnvConf.DBConf.VaultServerURL,
			InstanceEnvConf.DBConf.VaultAPIKey,
			InstanceEnvConf.DBConf.VaultPrefix,
		)
	}
}
