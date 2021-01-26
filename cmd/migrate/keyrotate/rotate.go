package keyrotate

import (
	"github.com/porter-dev/porter/internal/models"
	gorm "github.com/porter-dev/porter/internal/repository/gorm"

	_gorm "gorm.io/gorm"
)

// process 100 records at a time
const stepSize = 100

func Rotate(db *_gorm.DB, oldKey, newKey *[32]byte) error {
	err := rotateClusterModel(db, oldKey, newKey)

	if err != nil {
		return err
	}

	return nil
}

func rotateClusterModel(db *_gorm.DB, oldKey, newKey *[32]byte) error {
	// get count of model
	var count int64

	if err := db.Model(&models.Cluster{}).Count(&count).Error; err != nil {
		return err
	}

	// cluster-scoped repository
	repo := gorm.NewClusterRepository(db, oldKey).(*gorm.ClusterRepository)

	// iterate (count / stepSize) + 1 times using Limit and Offset
	for i := 0; i < (int(count)/stepSize)+1; i++ {
		clusters := []*models.Cluster{}

		if err := db.Offset(i * stepSize).Limit(stepSize).Find(&clusters).Error; err != nil {
			return err
		}

		// decrypt with the old key
		for _, cluster := range clusters {
			repo.DecryptClusterData(cluster, oldKey)
		}

		// encrypt with the new key and re-insert
		for _, cluster := range clusters {
			repo.EncryptClusterData(cluster, newKey)

			if err := db.Save(cluster).Error; err != nil {
				return err
			}
		}
	}

	return nil
}
