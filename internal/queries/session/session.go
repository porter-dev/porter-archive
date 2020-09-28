package session

import (
	gormtest "github.com/jinzhu/gorm"
	"github.com/porter-dev/porter/internal/models"
)

// Repository for testing. Potential TODO: swap out actual functional calls to point to repoitory.
type Repository interface {
	CreateSession(session *models.Session) (*models.Session, error)
	UpdateSession(session *models.Session) (*models.Session, error)
	DeleteSession(session *models.Session) (*models.Session, error)
	SelectSession(session *models.Session) (*models.Session, error)
}

type repo struct {
	db *gormtest.DB
}

// CreateSession must take in Key, Data, and ExpiresAt as arguments.
func (s *repo) CreateSession(session *models.Session) (*models.Session, error) {
	// TODO: check for duplicate and return error
	if err := s.db.Create(session).Error; err != nil {
		return nil, err
	}
	return session, nil
}

// UpdateSession updates only the Data field using Key as selector.
func (s *repo) UpdateSession(session *models.Session) (*models.Session, error) {
	if err := s.db.Model(session).Where("Key = ?", session.Key).Updates(session).Error; err != nil {
		return nil, err
	}
	return session, nil
}

// DeleteSession deletes a session by Key
func (s *repo) DeleteSession(session *models.Session) (*models.Session, error) {

	if err := s.db.Where("Key = ?", session.Key).Delete(session).Error; err != nil {
		return nil, err
	}

	return session, nil
}

// SelectSession returns a session with matching key
func (s *repo) SelectSession(session *models.Session) (*models.Session, error) {

	if err := s.db.Where("Key = ?", session.Key).First(session).Error; err != nil {
		return nil, err
	}

	return session, nil
}

// CreateRepository ...
func CreateRepository(db *gormtest.DB) Repository {
	return &repo{
		db: db,
	}
}
