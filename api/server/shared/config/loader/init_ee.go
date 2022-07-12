//go:build ee
// +build ee

package loader

import (
	eeBilling "github.com/porter-dev/porter/ee/billing"
	"github.com/porter-dev/porter/ee/integrations/vault"
	"github.com/porter-dev/porter/ee/models"
	"github.com/porter-dev/porter/internal/billing"
)

func init() {
	sharedInit()

	InstanceDB.AutoMigrate(
		&models.ProjectBilling{},
		&models.UserBilling{},
	)

	var key [32]byte

	for i, b := range []byte(InstanceEnvConf.DBConf.EncryptionKey) {
		key[i] = b
	}

	if InstanceEnvConf.ServerConf.BillingPrivateServerURL != "" && InstanceEnvConf.ServerConf.BillingPrivateKey != "" && InstanceEnvConf.ServerConf.BillingPublicServerURL != "" {
		serverURL := InstanceEnvConf.ServerConf.BillingPrivateServerURL
		publicServerURL := InstanceEnvConf.ServerConf.BillingPublicServerURL
		apiKey := InstanceEnvConf.ServerConf.BillingPrivateKey
		var err error

		InstanceBillingManager, err = eeBilling.NewClient(serverURL, publicServerURL, apiKey)

		if err != nil {
			panic(err)
		}
	} else {
		InstanceBillingManager = &billing.NoopBillingManager{}
	}

	if InstanceEnvConf.DBConf.VaultAPIKey != "" && InstanceEnvConf.DBConf.VaultServerURL != "" && InstanceEnvConf.DBConf.VaultPrefix != "" {
		InstanceCredentialBackend = vault.NewClient(
			InstanceEnvConf.DBConf.VaultServerURL,
			InstanceEnvConf.DBConf.VaultAPIKey,
			InstanceEnvConf.DBConf.VaultPrefix,
		)
	}
}
