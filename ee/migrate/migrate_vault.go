package migrate

import (
	"fmt"

	"github.com/porter-dev/porter/api/server/shared/config/env"
	"github.com/porter-dev/porter/ee/integrations/vault"
	ints "github.com/porter-dev/porter/internal/models/integrations"
	"github.com/porter-dev/porter/internal/repository/credentials"
	"gorm.io/gorm"
)

// process 100 records at a time
const stepSize = 100

func MigrateVault(db *gorm.DB, dbConf *env.DBConf) error {
	var vaultClient *vault.Client

	if dbConf.VaultAPIKey != "" && dbConf.VaultServerURL != "" && dbConf.VaultPrefix != "" {
		vaultClient = vault.NewClient(
			dbConf.VaultServerURL,
			dbConf.VaultAPIKey,
			dbConf.VaultPrefix,
		)
	} else {
		return fmt.Errorf("env variables not properly set for vault migration")
	}

	err := migrateOAuthIntegrationModel(db, vaultClient)

	if err != nil {
		fmt.Printf("failed on oauth migration: %v\n", err)

		return err
	}

	err = migrateGCPIntegrationModel(db, vaultClient)

	if err != nil {
		fmt.Printf("failed on gcp migration: %v\n", err)

		return err
	}

	err = migrateAWSIntegrationModel(db, vaultClient)

	if err != nil {
		fmt.Printf("failed on aws migration: %v\n", err)

		return err
	}

	return nil
}

func migrateOAuthIntegrationModel(db *gorm.DB, client *vault.Client) error {
	// get count of model
	var count int64

	if err := db.Model(&ints.OAuthIntegration{}).Count(&count).Error; err != nil {
		return err
	}

	// make a map of ids to errors -- we don't clear the integrations with errors
	errors := make(map[uint]error)

	// iterate (count / stepSize) + 1 times using Limit and Offset
	for i := 0; i < (int(count)/stepSize)+1; i++ {
		oauths := []*ints.OAuthIntegration{}

		if err := db.Order("id asc").Offset(i * stepSize).Limit(stepSize).Find(&oauths).Error; err != nil {
			return err
		}

		// decrypt with the old key
		for _, oauth := range oauths {
			// Check if record already exists in vault client. If so, we don't write anything to vault,
			// since we don't want to overwrite any data that's been written.
			if resp, _ := client.GetOAuthCredential(oauth); resp != nil {
				continue
			}

			// write the data to the vault client
			if err := client.WriteOAuthCredential(oauth, &credentials.OAuthCredential{
				ClientID:     oauth.ClientID,
				AccessToken:  oauth.AccessToken,
				RefreshToken: oauth.RefreshToken,
			}); err != nil {
				errors[oauth.ID] = err
				fmt.Printf("oauth vault write error on ID %d: %v\n", oauth.ID, err)
			}
		}
	}

	fmt.Printf("migrated %d oauth integrations with %d errors\n", count, len(errors))

	saveErrors := make(map[uint]error, 0)

	// iterate a second time, clearing the data
	// iterate (count / stepSize) + 1 times using Limit and Offset
	for i := 0; i < (int(count)/stepSize)+1; i++ {
		oauths := []*ints.OAuthIntegration{}

		if err := db.Order("id asc").Offset(i * stepSize).Limit(stepSize).Find(&oauths).Error; err != nil {
			return err
		}

		// decrypt with the old key
		for _, oauth := range oauths {
			if _, found := errors[oauth.ID]; !found {
				// clear the data from the db, and save
				oauth.ClientID = []byte{}
				oauth.AccessToken = []byte{}
				oauth.RefreshToken = []byte{}

				if err := db.Save(oauth).Error; err != nil {
					saveErrors[oauth.ID] = err
				}
			}
		}
	}

	fmt.Printf("cleared %d oauth integrations with %d errors\n", count, len(saveErrors))

	for saveErrorID, saveError := range saveErrors {
		fmt.Printf("oauth save error on ID %d: %v\n", saveErrorID, saveError)
	}

	return nil
}

func migrateGCPIntegrationModel(db *gorm.DB, client *vault.Client) error {
	// get count of model
	var count int64

	if err := db.Model(&ints.GCPIntegration{}).Count(&count).Error; err != nil {
		return err
	}

	// make a map of ids to errors -- we don't clear the integrations with errors
	errors := make(map[uint]error)

	// iterate (count / stepSize) + 1 times using Limit and Offset
	for i := 0; i < (int(count)/stepSize)+1; i++ {
		gcps := []*ints.GCPIntegration{}

		if err := db.Order("id asc").Offset(i * stepSize).Limit(stepSize).Find(&gcps).Error; err != nil {
			return err
		}

		// decrypt with the old key
		for _, gcp := range gcps {
			// Check if record already exists in vault client. If so, we don't write anything to vault,
			// since we don't want to overwrite any data that's been written.
			if resp, _ := client.GetGCPCredential(gcp); resp != nil {
				continue
			}

			// write the data to the vault client
			if err := client.WriteGCPCredential(gcp, &credentials.GCPCredential{
				GCPKeyData: gcp.GCPKeyData,
			}); err != nil {
				errors[gcp.ID] = err
				fmt.Printf("gcp vault write error on ID %d: %v\n", gcp.ID, err)
			}
		}
	}

	fmt.Printf("migrated %d gcp integrations with %d errors\n", count, len(errors))

	saveErrors := make(map[uint]error, 0)

	// iterate a second time, clearing the data
	// iterate (count / stepSize) + 1 times using Limit and Offset
	for i := 0; i < (int(count)/stepSize)+1; i++ {
		gcps := []*ints.GCPIntegration{}

		if err := db.Order("id asc").Offset(i * stepSize).Limit(stepSize).Find(&gcps).Error; err != nil {
			return err
		}

		// decrypt with the old key
		for _, gcp := range gcps {
			if _, found := errors[gcp.ID]; !found {
				// clear the data from the db, and save
				gcp.GCPKeyData = []byte{}

				if err := db.Save(gcp).Error; err != nil {
					saveErrors[gcp.ID] = err
				}
			}
		}
	}

	fmt.Printf("cleared %d gcp integrations with %d errors\n", count, len(saveErrors))

	for saveErrorID, saveError := range saveErrors {
		fmt.Printf("gcp save error on ID %d: %v\n", saveErrorID, saveError)
	}

	return nil
}

func migrateAWSIntegrationModel(db *gorm.DB, client *vault.Client) error {
	// get count of model
	var count int64

	if err := db.Model(&ints.AWSIntegration{}).Count(&count).Error; err != nil {
		return err
	}

	// make a map of ids to errors -- we don't clear the integrations with errors
	errors := make(map[uint]error)

	// iterate (count / stepSize) + 1 times using Limit and Offset
	for i := 0; i < (int(count)/stepSize)+1; i++ {
		awss := []*ints.AWSIntegration{}

		if err := db.Order("id asc").Offset(i * stepSize).Limit(stepSize).Find(&awss).Error; err != nil {
			return err
		}

		// decrypt with the old key
		for _, aws := range awss {
			// Check if record already exists in vault client. If so, we don't write anything to vault,
			// since we don't want to overwrite any data that's been written.
			if resp, _ := client.GetAWSCredential(aws); resp != nil {
				continue
			}

			// write the data to the vault client
			if err := client.WriteAWSCredential(aws, &credentials.AWSCredential{
				AWSAccessKeyID:     aws.AWSAccessKeyID,
				AWSClusterID:       aws.AWSClusterID,
				AWSSecretAccessKey: aws.AWSSecretAccessKey,
				AWSSessionToken:    aws.AWSSessionToken,
			}); err != nil {
				errors[aws.ID] = err
				fmt.Printf("aws vault write error on ID %d: %v\n", aws.ID, err)
			}
		}
	}

	fmt.Printf("migrated %d aws integrations with %d errors\n", count, len(errors))

	saveErrors := make(map[uint]error, 0)

	// iterate a second time, clearing the data
	// iterate (count / stepSize) + 1 times using Limit and Offset
	for i := 0; i < (int(count)/stepSize)+1; i++ {
		awss := []*ints.AWSIntegration{}

		if err := db.Order("id asc").Offset(i * stepSize).Limit(stepSize).Find(&awss).Error; err != nil {
			return err
		}

		// decrypt with the old key
		for _, aws := range awss {
			if _, found := errors[aws.ID]; !found {
				// clear the data from the db, and save
				aws.AWSAccessKeyID = []byte{}
				aws.AWSClusterID = []byte{}
				aws.AWSSecretAccessKey = []byte{}
				aws.AWSSessionToken = []byte{}

				if err := db.Save(aws).Error; err != nil {
					saveErrors[aws.ID] = err
				}
			}
		}
	}

	fmt.Printf("cleared %d aws integrations with %d errors\n", count, len(saveErrors))

	for saveErrorID, saveError := range saveErrors {
		fmt.Printf("aws save error on ID %d: %v\n", saveErrorID, saveError)
	}

	return nil
}
