package gorm

import (
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"gorm.io/gorm"
)

type sessionrepo struct {
	db *gorm.DB
}

// NewSessionRepository returns pointer to repo along with the db
func NewSessionRepository(db *gorm.DB) repository.SessionRepository {
	return &sessionrepo{
		db: db,
	}
}

// CreateSession must take in Key, Data, and ExpiresAt as arguments.
func (s *sessionrepo) CreateSession(session *models.Session) (*models.Session, error) {
	// TODO: check for duplicate and return error
	if err := s.db.Create(session).Error; err != nil {
		return nil, err
	}
	return session, nil
}

// UpdateSession updates only the Data field using Key as selector.
func (s *sessionrepo) UpdateSession(session *models.Session) (*models.Session, error) {
	if err := s.db.Model(session).Where("Key = ?", session.Key).Updates(session).Error; err != nil {
		return nil, err
	}
	return session, nil
}

// DeleteSession deletes a session by Key
func (s *sessionrepo) DeleteSession(session *models.Session) (*models.Session, error) {

	if err := s.db.Where("Key = ?", session.Key).Delete(session).Error; err != nil {
		return nil, err
	}

	return session, nil
}

// SelectSession returns a session with matching key
func (s *sessionrepo) SelectSession(session *models.Session) (*models.Session, error) {

	if err := s.db.Where("Key = ?", session.Key).First(session).Error; err != nil {
		return nil, err
	}

	return session, nil
}
