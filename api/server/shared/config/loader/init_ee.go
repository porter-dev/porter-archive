// +build ee

package loader

import (
	eeBilling "github.com/porter-dev/porter/ee/billing"
	"github.com/porter-dev/porter/ee/models"
	eeGorm "github.com/porter-dev/porter/ee/repository/gorm"
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

	eeRepo := eeGorm.NewEERepository(InstanceDB, &key)

	if InstanceEnvConf.ServerConf.IronPlansAPIKey != "" && InstanceEnvConf.ServerConf.IronPlansServerURL != "" {
		serverURL := InstanceEnvConf.ServerConf.IronPlansServerURL
		apiKey := InstanceEnvConf.ServerConf.IronPlansAPIKey
		var err error

		InstanceBillingManager, err = eeBilling.NewClient(serverURL, apiKey, eeRepo)

		if err != nil {
			panic(err)
		}
	} else {
		InstanceBillingManager = &billing.NoopBillingManager{}
	}
}
