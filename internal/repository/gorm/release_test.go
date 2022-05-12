package gorm_test

import (
	"fmt"
	"testing"

	"github.com/go-test/deep"
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

	release, err := tester.repo.Release().CreateRelease(release)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	release, err = tester.repo.Release().ReadRelease(1, release.Name, release.Namespace)

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

	release, err = tester.repo.Release().ReadReleaseByWebhookToken(release.WebhookToken)

	if release.Name != "denver-meister-dakota" {
		t.Errorf("incorrect project name: expected %s, got %s\n", "denver-meister-dakota", release.Name)
	}
}

func TestListReleasesByImageRepoURI(t *testing.T) {
	tester := &tester{
		dbFileName: "./porter_list_releases.db",
	}

	setupTestEnv(tester, t)
	defer cleanup(tester, t)

	imageRepoURIs := []string{
		"uri1",
		"uri2",
		"uri3",
		"uri1",
		"uri1",
	}

	releases := make([]*models.Release, 0)

	for i, uri := range imageRepoURIs {
		release := &models.Release{
			Name:         fmt.Sprintf("denver-meister-dakota-%d", i),
			Namespace:    "default",
			ProjectID:    1,
			ClusterID:    1,
			WebhookToken: fmt.Sprintf("abcdefgh-%d", i),
			ImageRepoURI: uri,
			Tags:         make([]*models.Tag, 0),
		}

		release, err := tester.repo.Release().CreateRelease(release)

		if err != nil {
			t.Fatalf("%v\n", err)
		}

		if uri == "uri1" {
			releases = append(releases, release)
		}
	}

	resReleases, err := tester.repo.Release().ListReleasesByImageRepoURI(1, "uri1")

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	// make sure resulting arrays match
	if len(resReleases) != 3 {
		t.Fatalf("length of resulting release list not 3")
	}

	if diff := deep.Equal(releases, resReleases); diff != nil {
		t.Errorf("release entry not equal:")
		t.Error(diff)
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

	release, err := tester.repo.Release().CreateRelease(release)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	release, err = tester.repo.Release().ReadRelease(1, release.Name, release.Namespace)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	_, err = tester.repo.Release().DeleteRelease(release)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	_, err = tester.repo.Release().ReadRelease(1, release.Name, release.Namespace)

	if err != orm.ErrRecordNotFound {
		t.Fatalf("incorrect error: expected %v, got %v\n", orm.ErrRecordNotFound, err)
	}
}
