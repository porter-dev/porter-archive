package gorm_test

import (
	"testing"
	"time"

	"github.com/go-test/deep"
	"github.com/porter-dev/porter/internal/models"
	"gorm.io/gorm"
)

func TestCreateInvite(t *testing.T) {
	tester := &tester{
		dbFileName: "./porter_create_invite.db",
	}

	setupTestEnv(tester, t)
	initProject(tester, t)
	defer cleanup(tester, t)

	expiry := time.Now().Add(24 * time.Hour)

	invite := &models.Invite{
		Token:     "abcd",
		Expiry:    &expiry,
		Email:     "testing@test.it",
		ProjectID: 1,
	}

	invite, err := tester.repo.Invite().CreateInvite(invite)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	invite, err = tester.repo.Invite().ReadInvite(1, invite.Model.ID)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	// make sure id is 1, project id is 1 and token is "abcd"
	if invite.Model.ID != 1 {
		t.Errorf("incorrect invite ID: expected %d, got %d\n", 1, invite.Model.ID)
	}

	if invite.ProjectID != 1 {
		t.Errorf("incorrect invite project ID: expected %d, got %d\n", 1, invite.ProjectID)
	}

	if invite.Token != "abcd" {
		t.Errorf("incorrect token: expected %s, got %s\n", "abcd", invite.Token)
	}

	if invite.Email != "testing@test.it" {
		t.Errorf("incorrect email: expected %s, got %s\n", "testing@test.it", invite.Email)
	}
}

func TestListInvitesByProjectID(t *testing.T) {
	tester := &tester{
		dbFileName: "./porter_list_invites.db",
	}

	setupTestEnv(tester, t)
	initProject(tester, t)
	initInvite(tester, t)
	defer cleanup(tester, t)

	invites, err := tester.repo.Invite().ListInvitesByProjectID(
		tester.initProjects[0].Model.ID,
	)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	if len(invites) != 1 {
		t.Fatalf("length of invites incorrect: expected %d, got %d\n", 1, len(invites))
	}

	// make sure data is correct
	expInvite := models.Invite{
		Token:     "abcd",
		Email:     "testing@test.it",
		Expiry:    &time.Time{},
		ProjectID: 1,
	}

	invite := invites[0]
	invite.Expiry = &time.Time{}

	// reset fields for reflect.DeepEqual
	invite.Model = gorm.Model{}

	if diff := deep.Equal(expInvite, *invite); diff != nil {
		t.Errorf("incorrect invite")
		t.Error(diff)
	}
}
