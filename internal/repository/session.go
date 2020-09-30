package repository

import (
	"github.com/porter-dev/porter/internal/models"
)

// SessionRepository represents the set of queries on the Session model
type SessionRepository interface {
	CreateSession(session *models.Session) (*models.Session, error)
	UpdateSession(session *models.Session) (*models.Session, error)
	DeleteSession(session *models.Session) (*models.Session, error)
	SelectSession(session *models.Session) (*models.Session, error)
}
