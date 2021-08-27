package apitest

import (
	"testing"

	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/internal/models"
	"golang.org/x/crypto/bcrypt"
)

func CreateTestUser(t *testing.T, config *config.Config, verified bool) *models.User {
	hashedPw, _ := bcrypt.GenerateFromPassword([]byte("hello"), 8)

	user, err := config.Repo.User().CreateUser(&models.User{
		Email:         "test@test.it",
		Password:      string(hashedPw),
		EmailVerified: verified,
	})

	if err != nil {
		t.Fatal(err)
	}

	return user
}
