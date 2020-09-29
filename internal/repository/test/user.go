package test

import (
	"errors"

	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"gorm.io/gorm"
)

// UserRepository will return errors on queries if canQuery is false
// and only stores a small set of users in-memory that are indexed by their
// array index + 1
type UserRepository struct {
	canQuery bool
	users    []*models.User
}

// NewUserRepository will return errors
func NewUserRepository(canQuery bool) repository.UserRepository {
	return &UserRepository{canQuery, []*models.User{}}
}

// CreateUser adds a new User row to the Users table in array memory
func (repo *UserRepository) CreateUser(user *models.User) (*models.User, error) {
	if !repo.canQuery {
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
	if !repo.canQuery {
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
	if !repo.canQuery {
		return nil, errors.New("Cannot read from database")
	}

	for _, u := range repo.users {
		if u.Email == email {
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
	if !repo.canQuery {
		return nil, errors.New("Cannot write database")
	}

	if int(user.ID-1) >= len(repo.users) || repo.users[user.ID-1] == nil {
		return nil, gorm.ErrRecordNotFound
	}

	index := int(user.ID - 1)
	repo.users[index] = nil

	return user, nil
}
