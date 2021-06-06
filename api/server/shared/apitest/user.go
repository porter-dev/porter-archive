package apitest

import (
	"testing"

	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/internal/models"
)

func CreateTestUser(t *testing.T, config *shared.Config) *models.User {
	user, err := config.Repo.User().CreateUser(&models.User{
		Email:         "test@test.it",
		Password:      "hello",
		EmailVerified: true,
	})

	if err != nil {
		t.Fatal(err)
	}

	return user
}
