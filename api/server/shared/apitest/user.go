package apitest

import (
	"testing"

	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/internal/models"
	"golang.org/x/crypto/bcrypt"
)

func CreateTestUser(t *testing.T, config *shared.Config) *models.User {
	hashedPw, _ := bcrypt.GenerateFromPassword([]byte("hello"), 8)

	user, err := config.Repo.User().CreateUser(&models.User{
		Email:         "test@test.it",
		Password:      string(hashedPw),
		EmailVerified: true,
	})

	if err != nil {
		t.Fatal(err)
	}

	return user
}
