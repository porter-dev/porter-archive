package gorm_test

import (
	"testing"

	"github.com/porter-dev/porter/internal/models"
	orm "gorm.io/gorm"
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

	release, err = tester.repo.Release.ReadRelease(1, release.Name, release.Namespace)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	// make sure id and name are correct"
	if release.Model.ID != 1 {
		t.Errorf("incorrect release ID: expected %d, got %d\n", 1, release.Model.ID)
	}

	if release.Name != "denver-meister-dakota" {
		t.Errorf("incorrect project name: expected %s, got %s\n", "denver-meister-dakota", release.Name)
	}

	if release.WebhookToken != "abcdefgh" {
		t.Errorf("incorrect webhook token: expected %s, got %s\n", "abcdefgh", release.WebhookToken)
	}

	release, err = tester.repo.Release.ReadReleaseByWebhookToken(release.WebhookToken)

	if release.Name != "denver-meister-dakota" {
		t.Errorf("incorrect project name: expected %s, got %s\n", "denver-meister-dakota", release.Name)
	}
}

func TestDeleteRelease(t *testing.T) {
	tester := &tester{
		dbFileName: "./porter_delete_release.db",
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

	release, err = tester.repo.Release.ReadRelease(1, release.Name, release.Namespace)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	_, err = tester.repo.Release.DeleteRelease(release)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	_, err = tester.repo.Release.ReadRelease(1, release.Name, release.Namespace)

	if err != orm.ErrRecordNotFound {
		t.Fatalf("incorrect error: expected %v, got %v\n", orm.ErrRecordNotFound, err)
	}
}
