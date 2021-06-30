package test

import (
	"errors"
	"strings"

	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

const (
	CreateUserMethod      string = "create_user_0"
	ReadUserMethod        string = "read_user_0"
	ReadUserByEmailMethod string = "read_user_by_email_0"
	DeleteUserMethod      string = "delete_user_0"
)

// UserRepository will return errors on queries if canQuery is false
// and only stores a small set of users in-memory that are indexed by their
// array index + 1
type UserRepository struct {
	canQuery       bool
	failingMethods string
	users          []*models.User
}

// NewUserRepository will return errors if canQuery is false
func NewUserRepository(canQuery bool, failingMethods ...string) repository.UserRepository {
	return &UserRepository{canQuery, strings.Join(failingMethods, ","), []*models.User{}}
}

// CreateUser adds a new User row to the Users table in array memory
func (repo *UserRepository) CreateUser(user *models.User) (*models.User, error) {
	if !repo.canQuery || strings.Contains(repo.failingMethods, CreateUserMethod) {
		return nil, errors.New("Cannot write database")
	}

	// make sure email doesn't exist
	for _, u := range repo.users {
		if u.Email == user.Email {
			return nil, errors.New("Cannot write database")
		}
	}

	users := repo.users
	users = append(users, user)
	repo.users = users
	user.ID = uint(len(repo.users))
	return user, nil
}

// ReadUser finds a single user based on their unique id
func (repo *UserRepository) ReadUser(id uint) (*models.User, error) {
	if !repo.canQuery || strings.Contains(repo.failingMethods, ReadUserMethod) {
		return nil, errors.New("Cannot read from database")
	}

	if int(id-1) >= len(repo.users) || repo.users[id-1] == nil {
		return nil, gorm.ErrRecordNotFound
	}

	index := int(id - 1)
	return repo.users[index], nil
}

// ReadUserByEmail finds a single user based on their unique email
func (repo *UserRepository) ReadUserByEmail(email string) (*models.User, error) {
	if !repo.canQuery || strings.Contains(repo.failingMethods, ReadUserByEmailMethod) {
		return nil, errors.New("Cannot read from database")
	}

	for _, u := range repo.users {
		if u.Email == email {
			return u, nil
		}
	}

	return nil, gorm.ErrRecordNotFound
}

// ReadUserByGithubUserID finds a single user based on their github id field
func (repo *UserRepository) ReadUserByGithubUserID(id int64) (*models.User, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot read from database")
	}

	for _, u := range repo.users {
		if u.GithubUserID == id && id != 0 {
			return u, nil
		}
	}

	return nil, gorm.ErrRecordNotFound
}

// ReadUserByGoogleUserID finds a single user based on their github id field
func (repo *UserRepository) ReadUserByGoogleUserID(id string) (*models.User, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot read from database")
	}

	for _, u := range repo.users {
		if u.GoogleUserID == id && id != "" {
			return u, nil
		}
	}

	return nil, gorm.ErrRecordNotFound
}

// UpdateUser modifies an existing User in the database
func (repo *UserRepository) UpdateUser(user *models.User) (*models.User, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot write database")
	}

	if int(user.ID-1) >= len(repo.users) || repo.users[user.ID-1] == nil {
		return nil, gorm.ErrRecordNotFound
	}

	index := int(user.ID - 1)
	oldUser := *repo.users[index]
	repo.users[index] = user
	user.Email = oldUser.Email
	user.Password = oldUser.Password

	return user, nil
}

// DeleteUser deletes a single user using their unique id
func (repo *UserRepository) DeleteUser(user *models.User) (*models.User, error) {
	if !repo.canQuery || strings.Contains(repo.failingMethods, DeleteUserMethod) {
		return nil, errors.New("Cannot write database")
	}

	if int(user.ID-1) >= len(repo.users) || repo.users[user.ID-1] == nil {
		return nil, gorm.ErrRecordNotFound
	}

	index := int(user.ID - 1)
	repo.users[index] = nil

	return user, nil
}

// CheckPassword checks the input password is correct for the provided user id.
func (repo *UserRepository) CheckPassword(id int, pwd string) (bool, error) {
	if !repo.canQuery {
		return false, errors.New("Cannot write database")
	}

	if int(id-1) >= len(repo.users) || repo.users[id-1] == nil {
		return false, gorm.ErrRecordNotFound
	}

	index := int(id - 1)
	user := *repo.users[index]

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(pwd)); err != nil {
		return false, err
	}

	return true, nil
}
