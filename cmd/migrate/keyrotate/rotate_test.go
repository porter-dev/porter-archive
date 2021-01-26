package keyrotate_test

import (
	"testing"

	"github.com/porter-dev/porter/cmd/migrate/keyrotate"
	"github.com/porter-dev/porter/internal/models"
	gorm "github.com/porter-dev/porter/internal/repository/gorm"
)

func TestClusterModelRotation(t *testing.T) {
	var newKey [32]byte

	for i, b := range []byte("__r3n3o3_s3r3n3_3n3r3p3i3n_k3y__") {
		newKey[i] = b
	}

	tester := &tester{
		dbFileName: "./porter_cluster_rotate.db",
	}

	setupTestEnv(tester, t)

	for i := 0; i < 100; i++ {
		initCluster(tester, t)
	}

	defer cleanup(tester, t)

	keyrotate.Rotate(tester.DB, tester.Key, &newKey)

	// very all clusters decoded properly
	repo := gorm.NewClusterRepository(tester.DB, &newKey).(*gorm.ClusterRepository)

	clusters := []*models.Cluster{}

	if err := tester.DB.Find(&clusters).Error; err != nil {
		t.Fatalf("%v\n", err)
	}

	// decrypt with the old key
	for _, cluster := range clusters {
		repo.DecryptClusterData(cluster, &newKey)

		if string(cluster.CertificateAuthorityData) != "-----BEGIN" {
			t.Errorf("%s\n", string(cluster.CertificateAuthorityData))
		}
	}
}
