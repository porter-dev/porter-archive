package session

import (
	"github.com/porter-dev/porter/internal/models"
	"gorm.io/gorm"
)

// Repository for testing. Potential TODO: swap out actual functional calls to point to repoitory.
type Repository interface {
	CreateSession(db *gorm.DB, session *models.Session) (*models.Session, error)
	UpdateSession(db *gorm.DB, session *models.Session) (*models.Session, error)
	DeleteSession(db *gorm.DB, session *models.Session) (*models.Session, error)
	SelectSession(db *gorm.DB, session *models.Session) (*models.Session, error)
}

// CreateSession must take in Key, Data, and ExpiresAt as arguments.
func CreateSession(db *gorm.DB, session *models.Session) (*models.Session, error) {
	// TODO: check for duplicate and return error
	if err := db.Create(session).Error; err != nil {
		return nil, err
	}
	return session, nil
}

// UpdateSession updates only the Data field using Key as selector.
func UpdateSession(db *gorm.DB, session *models.Session) (*models.Session, error) {
	if err := db.Model(session).Where("Key = ?", session.Key).Updates(session).Error; err != nil {
		return nil, err
	}
	return session, nil
}

// DeleteSession deletes a session by Key
func DeleteSession(db *gorm.DB, session *models.Session) (*models.Session, error) {

	if err := db.Where("Key = ?", session.Key).Delete(session).Error; err != nil {
		return nil, err
	}

	return session, nil
}

// SelectSession returns a session with matching key
func SelectSession(db *gorm.DB, session *models.Session) (*models.Session, error) {

	if err := db.Where("Key = ?", session.Key).First(session).Error; err != nil {
		return nil, err
	}

	return session, nil
}
