package keyrotate_test

import (
	"fmt"
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

	for i := 0; i < 1; i++ {
		initCluster(tester, t)
	}

	defer cleanup(tester, t)

	err := keyrotate.Rotate(tester.DB, tester.Key, &newKey)

	if err != nil {
		t.Fatalf("error rotating: %v\n", err)
	}

	// very all clusters decoded properly
	repo := gorm.NewClusterRepository(tester.DB, &newKey).(*gorm.ClusterRepository)

	clusters := []*models.Cluster{}

	if err := tester.DB.Preload("TokenCache").Find(&clusters).Error; err != nil {
		t.Fatalf("%v\n", err)
	}

	// decrypt with the old key
	for _, c := range clusters {
		fmt.Println("GOT TOKEN", string(c.TokenCache.Token))

		cluster, err := repo.ReadCluster(c.ID)

		if err != nil {
			t.Fatalf("error reading cluster: %v\n", err)
		}

		if string(cluster.CertificateAuthorityData) != "-----BEGIN" {
			t.Errorf("%s\n", string(cluster.CertificateAuthorityData))
		}

		if string(cluster.TokenCache.Token) != "token-1" {
			t.Errorf("%s\n", string(cluster.TokenCache.Token))
		}
	}
}
