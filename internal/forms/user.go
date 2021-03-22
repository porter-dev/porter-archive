package forms

import (
	"time"

	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// WriteUserForm is a generic form for write operations to the User model
type WriteUserForm interface {
	ToUser(repo repository.UserRepository) (*models.User, error)
}

// CreateUserForm represents the accepted values for creating a user
type CreateUserForm struct {
	WriteUserForm
	Email    string `json:"email" form:"required,max=255,email"`
	Password string `json:"password" form:"required,max=255"`
}

// ToUser converts a CreateUserForm to models.User
func (cuf *CreateUserForm) ToUser(_ repository.UserRepository) (*models.User, error) {
	hashed, err := bcrypt.GenerateFromPassword([]byte(cuf.Password), 8)

	if err != nil {
		return nil, err
	}

	return &models.User{
		Email:    cuf.Email,
		Password: string(hashed),
	}, nil
}

// LoginUserForm represents the accepted values for logging a user in
type LoginUserForm struct {
	WriteUserForm
	ID       uint   `form:"required"`
	Email    string `json:"email" form:"required,max=255,email"`
	Password string `json:"password" form:"required,max=255"`
}

// ToUser converts a LoginUserForm to models.User
func (luf *LoginUserForm) ToUser(_ repository.UserRepository) (*models.User, error) {
	hashed, err := bcrypt.GenerateFromPassword([]byte(luf.Password), 8)

	if err != nil {
		return nil, err
	}

	return &models.User{
		Email:    luf.Email,
		Password: string(hashed),
	}, nil
}

// DeleteUserForm represents the accepted values for deleting a user
type DeleteUserForm struct {
	WriteUserForm
	ID       uint   `form:"required"`
	Password string `json:"password" form:"required,max=255"`
}

// ToUser converts a DeleteUserForm to models.User using the user ID
func (uuf *DeleteUserForm) ToUser(_ repository.UserRepository) (*models.User, error) {
	return &models.User{
		Model: gorm.Model{
			ID: uuf.ID,
		},
	}, nil
}

// InitiateResetUserPasswordForm represents the accepted values for resetting a user's password
type InitiateResetUserPasswordForm struct {
	Email string `json:"email" form:"required"`
}

func (ruf *InitiateResetUserPasswordForm) ToPWResetToken() (*models.PWResetToken, string, error) {
	expiry := time.Now().Add(30 * time.Minute)

	rawToken := stringWithCharset(32, randCharset)

	hashedToken, err := bcrypt.GenerateFromPassword([]byte(rawToken), 8)

	if err != nil {
		return nil, "", err
	}

	return &models.PWResetToken{
		Email:   ruf.Email,
		IsValid: true,
		Expiry:  &expiry,
		Token:   string(hashedToken),
	}, rawToken, nil
}

type VerifyResetUserPasswordForm struct {
	Email          string `json:"email" form:"required,max=255,email"`
	PWResetTokenID uint   `json:"token_id" form:"required"`
	Token          string `json:"token" form:"required"`
}

type FinalizeResetUserPasswordForm struct {
	Email          string `json:"email" form:"required,max=255,email"`
	PWResetTokenID uint   `json:"token_id" form:"required"`
	Token          string `json:"token" form:"required"`
	NewPassword    string `json:"new_password" form:"required,max=255"`
}

type FinalizeVerifyEmailForm struct {
	TokenID uint   `json:"token_id" form:"required"`
	Token   string `json:"token" form:"required"`
}
