//go:build ee
// +build ee

package loader

import (
	// TODO: delete once the billing code is cleaned up
	// eeBilling "github.com/porter-dev/porter/ee/billing"
	"github.com/porter-dev/porter/ee/models"
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

	// TODO: delete once the billing code is cleaned up

	// if InstanceEnvConf.ServerConf.BillingPrivateServerURL != "" && InstanceEnvConf.ServerConf.BillingPrivateKey != "" && InstanceEnvConf.ServerConf.BillingPublicServerURL != "" {
	// 	serverURL := InstanceEnvConf.ServerConf.BillingPrivateServerURL
	// 	publicServerURL := InstanceEnvConf.ServerConf.BillingPublicServerURL
	// 	apiKey := InstanceEnvConf.ServerConf.BillingPrivateKey
	// 	var err error

	// 	InstanceBillingManager, err = eeBilling.NewClient(serverURL, publicServerURL, apiKey)

	// 	if err != nil {
	// 		panic(err)
	// 	}
	// } else {
	// 	InstanceBillingManager = &billing.StripeBillingManager{}
	// }
}
