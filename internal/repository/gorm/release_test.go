package gorm_test

import (
	"testing"

	"github.com/porter-dev/porter/internal/models"
)

func TestCreateRelease(t *testing.T) {
	tester := &tester{
		dbFileName: "./porter_create_release.db",
	}

	setupTestEnv(tester, t)
	defer cleanup(tester, t)

	release := &models.Release{
		Name:         "denver-meister-dakota",
		Namespace:    "default",
		ProjectID:    1,
		ClusterID:    1,
		WebhookToken: "abcdefgh",
	}

	release, err := tester.repo.Release.CreateRelease(release)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	// release, err = tester.repo.Release.ReadRelease(release.Name, release.Namespace)

	// if err != nil {
	// 	t.Fatalf("%v\n", err)
	// }

	// make sure id is 1 and name is "project-test"
	// if release.Model.ID != 1 {
	// 	t.Errorf("incorrect release ID: expected %d, got %d\n", 1, release.Model.ID)
	// }

	// if release.Name != "denver-meister-dakota" {
	// 	t.Errorf("incorrect project name: expected %s, got %s\n", "project-test", release.Name)
	// }
}
