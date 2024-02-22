package test

import (
	"errors"
	"strings"

	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"gorm.io/gorm"
)

const (
	CreateSessionMethod string = "create_session_0"
	SelectSessionMethod string = "select_session_0"
)

// SessionRepository uses gorm.DB for querying the database
type SessionRepository struct {
	canQuery       bool
	failingMethods string
	sessions       []*models.Session
}

// NewSessionRepository returns pointer to repo along with the db
func NewSessionRepository(canQuery bool, failingMethods ...string) repository.SessionRepository {
	return &SessionRepository{canQuery, strings.Join(failingMethods, ","), []*models.Session{}}
}

// CreateSession must take in Key, Data, and ExpiresAt as arguments.
func (repo *SessionRepository) CreateSession(session *models.Session) (*models.Session, error) {
	if !repo.canQuery || strings.Contains(repo.failingMethods, CreateSessionMethod) {
		return nil, errors.New("Cannot write database")
	}

	// make sure key doesn't exist
	for _, s := range repo.sessions {
		if s.Key == session.Key {
			return nil, errors.New("Cannot write database")
		}
	}

	sessions := repo.sessions
	sessions = append(sessions, session)
	repo.sessions = sessions
	session.ID = uint(len(repo.sessions))

	return session, nil
}

// UpdateSession updates only the Data field using Key as selector.
func (repo *SessionRepository) UpdateSession(session *models.Session) (*models.Session, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot write database")
	}

	var oldSession *models.Session

	for _, s := range repo.sessions {
		if s.Key == session.Key {
			oldSession = s
		}
	}

	if oldSession != nil {
		oldSession.Data = session.Data

		return oldSession, nil
	}

	return nil, gorm.ErrRecordNotFound
}

// DeleteSession deletes a session by Key
func (repo *SessionRepository) DeleteSession(session *models.Session) (*models.Session, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot write database")
	}

	if int(session.ID-1) >= len(repo.sessions) || repo.sessions[session.ID-1] == nil {
		return nil, gorm.ErrRecordNotFound
	}

	index := int(session.ID - 1)
	repo.sessions[index] = nil

	return session, nil
}

// SelectSession returns a session with matching key
func (repo *SessionRepository) SelectSession(session *models.Session) (*models.Session, error) {
	if !repo.canQuery || strings.Contains(repo.failingMethods, SelectSessionMethod) {
		return nil, errors.New("Cannot write database")
	}

	for _, s := range repo.sessions {
		if s.Key == session.Key {
			return s, nil
		}
	}

	return nil, gorm.ErrRecordNotFound
}
