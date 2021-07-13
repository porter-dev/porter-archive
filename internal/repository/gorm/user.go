package gorm

import (
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// UserRepository uses gorm.DB for querying the database
type UserRepository struct {
	db *gorm.DB
}

// NewUserRepository returns a DefaultUserRepository which uses
// gorm.DB for querying the database
func NewUserRepository(db *gorm.DB) repository.UserRepository {
	return &UserRepository{db}
}

// CreateUser adds a new User row to the Users table in the database
func (repo *UserRepository) CreateUser(user *models.User) (*models.User, error) {
	if err := repo.db.Create(user).Error; err != nil {
		return nil, err
	}
	return user, nil
}

// ReadUser finds a single user based on their unique id
func (repo *UserRepository) ReadUser(id uint) (*models.User, error) {
	user := &models.User{}
	if err := repo.db.Where("id = ?", id).First(&user).Error; err != nil {
		return nil, err
	}
	return user, nil
}

// ListUsersByIDs finds all users matching ids
func (repo *UserRepository) ListUsersByIDs(ids []uint) ([]*models.User, error) {
	users := make([]*models.User, 0)

	if err := repo.db.Model(&models.User{}).Where("id IN (?)", ids).Find(&users).Error; err != nil {
		return nil, err
	}

	return users, nil
}

// ReadUserByEmail finds a single user based on their unique email
func (repo *UserRepository) ReadUserByEmail(email string) (*models.User, error) {
	user := &models.User{}
	if err := repo.db.Where("email = ?", email).First(&user).Error; err != nil {
		return nil, err
	}
	return user, nil
}

// ReadUserByGithubUserID finds a single user based on their github user id
func (repo *UserRepository) ReadUserByGithubUserID(id int64) (*models.User, error) {
	user := &models.User{}
	if err := repo.db.Where("github_user_id = ?", id).First(&user).Error; err != nil {
		return nil, err
	}
	return user, nil
}

// ReadUserByGoogleUserID finds a single user based on their google user id
func (repo *UserRepository) ReadUserByGoogleUserID(id string) (*models.User, error) {
	user := &models.User{}
	if err := repo.db.Where("google_user_id = ?", id).First(&user).Error; err != nil {
		return nil, err
	}
	return user, nil
}

// UpdateUser modifies an existing User in the database
func (repo *UserRepository) UpdateUser(user *models.User) (*models.User, error) {
	if err := repo.db.Save(user).Error; err != nil {
		return nil, err
	}

	return user, nil
}

// DeleteUser deletes a single user using their unique id
func (repo *UserRepository) DeleteUser(user *models.User) (*models.User, error) {
	if err := repo.db.Delete(&user).Error; err != nil {
		return nil, err
	}
	return user, nil
}

// CheckPassword checks the input password is correct for the provided user id.
func (repo *UserRepository) CheckPassword(id int, pwd string) (bool, error) {
	u := &models.User{}

	if err := repo.db.First(u, id).Error; err != nil {
		return false, err
	}

	if err := bcrypt.CompareHashAndPassword([]byte(u.Password), []byte(pwd)); err != nil {
		return false, err
	}

	return true, nil
}
