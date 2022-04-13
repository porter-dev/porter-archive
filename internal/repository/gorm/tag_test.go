package gorm_test

import (
	"testing"
)

func TestCreateNewTag(t *testing.T) {
	tester := &tester{
		dbFileName: "./porter_create_tag.db",
	}

	setupTestEnv(tester, t)
	defer cleanup(tester, t)

}

func TestCreateTagThatAlreadyExistsOnProject(t *testing.T) {
	tester := &tester{
		dbFileName: "./porter_create_tag_already_exists.db",
	}

	setupTestEnv(tester, t)
	defer cleanup(tester, t)

}

func TestCreateTagThatAlreadyExistOnOtherProject(t *testing.T) {
	tester := &tester{
		dbFileName: "./porter_create_tag_exists_on_other_project.db",
	}

	setupTestEnv(tester, t)
	defer cleanup(tester, t)

}

func TestUpdateTag(t *testing.T) {
	tester := &tester{
		dbFileName: "./porter_update_tag.db",
	}

	setupTestEnv(tester, t)
	defer cleanup(tester, t)

}

func TestDeleteTag(t *testing.T) {
	tester := &tester{
		dbFileName: "./porter_delete_tag.db",
	}

	setupTestEnv(tester, t)
	defer cleanup(tester, t)

}

func TestAddTagToRelease(t *testing.T) {
	tester := &tester{
		dbFileName: "./porter_add_tag_to_release.db",
	}

	setupTestEnv(tester, t)
	defer cleanup(tester, t)

}

func TestRemoveTagFromRelease(t *testing.T) {
	tester := &tester{
		dbFileName: "./porter_remove_tag_from_release.db",
	}

	setupTestEnv(tester, t)
	defer cleanup(tester, t)

}
