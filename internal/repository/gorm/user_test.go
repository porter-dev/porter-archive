package gorm_test

import (
	"testing"

	"github.com/go-test/deep"
	"github.com/porter-dev/porter/internal/models"
)

func TestListUsersByIDs(t *testing.T) {
	tester := &tester{
		dbFileName: "./porter_list_users_by_ids.db",
	}

	setupTestEnv(tester, t)
	initMultiUser(tester, t)
	defer cleanup(tester, t)

	users, err := tester.repo.User.ListUsersByIDs([]uint{1, 2})

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	if diff := deep.Equal(tester.initUsers, users); diff != nil {
		t.Errorf("users not equal:")
		t.Error(diff)
	}

	users, err = tester.repo.User.ListUsersByIDs([]uint{1})

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	expUsers := []*models.User{tester.initUsers[0]}

	if diff := deep.Equal(expUsers, users); diff != nil {
		t.Errorf("users not equal:")
		t.Error(diff)
	}
}

func TestReadUserByGithubUserID(t *testing.T) {
	tester := &tester{
		dbFileName: "./porter_read_user_github.db",
	}

	setupTestEnv(tester, t)
	defer cleanup(tester, t)

	user := &models.User{
		Email:        "test@test.it",
		Password:     "fake",
		GithubUserID: 5,
	}

	user, err := tester.repo.User.CreateUser(user)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	readUser, err := tester.repo.User.ReadUserByGithubUserID(5)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	if diff := deep.Equal(user, readUser); diff != nil {
		t.Errorf("users not equal:")
		t.Error(diff)
	}
}

func TestReadUserByGoogleUserID(t *testing.T) {
	tester := &tester{
		dbFileName: "./porter_read_user_google.db",
	}

	setupTestEnv(tester, t)
	defer cleanup(tester, t)

	user := &models.User{
		Email:        "test@test.it",
		Password:     "fake",
		GoogleUserID: "alsdkfjsldaf",
	}

	user, err := tester.repo.User.CreateUser(user)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	readUser, err := tester.repo.User.ReadUserByGoogleUserID("alsdkfjsldaf")

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	if diff := deep.Equal(user, readUser); diff != nil {
		t.Errorf("users not equal:")
		t.Error(diff)
	}
}
