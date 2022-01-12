package test

import (
	"errors"

	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
)

// AllowlistRepository uses gorm.DB for querying the database
type AllowlistRepository struct {
	canQuery  bool
	allowlist []*models.Allowlist
}

// NewAllowlistRepository returns a AllowListRepository which uses
// gorm.DB for querying the database.
func NewAllowlistRepository(canQuery bool) repository.AllowlistRepository {
	return &AllowlistRepository{canQuery, []*models.Allowlist{}}
}

func (repo *AllowlistRepository) UserEmailExists(email string) (bool, error) {
	if !repo.canQuery {
		return false, errors.New("cannot read database")
	}

	if len(repo.allowlist) == 0 {
		return false, nil
	}

	founded := false

	for _, allowed := range repo.allowlist {
		if allowed.UserEmail == email {
			founded = true
			break
		}
	}

	return founded, nil
}
