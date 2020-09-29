// Package sessionstore is a postgresql backend implementation of gorilla/sessions Session interface, based on
// antonlindstrom/pgstore. Key change is to use GORM instead of typical sql driver using queries.
package sessionstore

import (
	"database/sql"
	"encoding/base32"
	"net/http"
	"strings"
	"time"

	"gorm.io/gorm"

	"github.com/gorilla/securecookie"
	"github.com/gorilla/sessions"
	"github.com/pkg/errors"

	"github.com/porter-dev/porter/internal/models"
	rp "github.com/porter-dev/porter/internal/repository/gorm"
)

// structs

// PGStore is a wrapper around gorilla/sessions store.
type PGStore struct {
	Codecs  []securecookie.Codec
	Options *sessions.Options
	Path    string
	DbPool  *gorm.DB
}

// Helpers

// MaxLength restricts the maximum length of new sessions to l.
// If l is 0 there is no limit to the size of a session, use with caution.
// The default for a new PGStore is 4096. PostgreSQL allows for max
// value sizes of up to 1GB (http://www.postgresql.org/docs/current/interactive/datatype-character.html)
func (db *PGStore) MaxLength(l int) {
	for _, c := range db.Codecs {
		if codec, ok := c.(*securecookie.SecureCookie); ok {
			codec.MaxLength(l)
		}
	}
}

// MaxAge sets the maximum age for the store and the underlying cookie
// implementation. Individual sessions can be deleted by setting Options.MaxAge
// = -1 for that session.
func (db *PGStore) MaxAge(age int) {
	db.Options.MaxAge = age

	// Set the maxAge for each securecookie instance.
	for _, codec := range db.Codecs {
		if sc, ok := codec.(*securecookie.SecureCookie); ok {
			sc.MaxAge(age)
		}
	}
}

// load fetches a session by ID from the database and decodes its content
// into session.Values.
func (db *PGStore) load(session *sessions.Session) error {
	repo := rp.NewRepository(db.DbPool)
	res, err := repo.Session.SelectSession(&models.Session{Key: session.ID})

	if err != nil {
		return err
	}

	return securecookie.DecodeMulti(session.Name(), string(res.Data), &session.Values, db.Codecs...)
}

// save writes encoded session.Values to a database record.
// writes to http_sessions table by default.
func (db *PGStore) save(session *sessions.Session) error {
	encoded, err := securecookie.EncodeMulti(session.Name(), session.Values, db.Codecs...)
	if err != nil {
		return err
	}

	exOn := session.Values["expires_on"]

	var expiresOn time.Time

	if exOn == nil {
		expiresOn = time.Now().Add(time.Second * time.Duration(session.Options.MaxAge))
	} else {
		expiresOn = exOn.(time.Time)
		if expiresOn.Sub(time.Now().Add(time.Second*time.Duration(session.Options.MaxAge))) < 0 {
			expiresOn = time.Now().Add(time.Second * time.Duration(session.Options.MaxAge))
		}
	}

	s := models.Session{
		Key:       session.ID,
		Data:      []byte(encoded),
		ExpiresAt: expiresOn,
	}

	repo := rp.NewRepository(db.DbPool)

	if session.IsNew {
		_, createErr := repo.Session.CreateSession(&s)
		return createErr
	}

	_, updateErr := repo.Session.UpdateSession(&s)
	return updateErr
}

// Implementation of the interface (Get, New, Save)

// NewStore takes an initialized db and session key pairs to create a session-store in postgres db.
func NewStore(db *gorm.DB, keyPairs ...[]byte) (*PGStore, error) {
	dbStore := &PGStore{
		Codecs: securecookie.CodecsFromPairs(keyPairs...),
		Options: &sessions.Options{
			Path:   "/",
			MaxAge: 86400 * 30,
		},
		DbPool: db,
	}

	return dbStore, nil
}

// Get Fetches a session for a given name after it has been added to the
// registry.
func (db *PGStore) Get(r *http.Request, name string) (*sessions.Session, error) {
	return sessions.GetRegistry(r).Get(db, name)
}

// New returns a new session for the given name without adding it to the registry.
func (db *PGStore) New(r *http.Request, name string) (*sessions.Session, error) {
	session := sessions.NewSession(db, name)
	if session == nil {
		return nil, nil
	}

	opts := *db.Options
	session.Options = &(opts)
	session.IsNew = true

	var err error
	if c, errCookie := r.Cookie(name); errCookie == nil {
		err = securecookie.DecodeMulti(name, c.Value, &session.ID, db.Codecs...)
		if err == nil {
			err = db.load(session)
			if err == nil {
				session.IsNew = false
			} else if errors.Cause(err) == sql.ErrNoRows {
				err = nil
			}
		}
	}

	db.MaxAge(db.Options.MaxAge)

	return session, err
}

// Save saves the given session into the database and deletes cookies if needed
func (db *PGStore) Save(r *http.Request, w http.ResponseWriter, session *sessions.Session) error {
	repo := rp.NewRepository(db.DbPool)

	// Set delete if max-age is < 0
	if session.Options.MaxAge < 0 {
		if _, err := repo.Session.DeleteSession(&models.Session{Key: session.ID}); err != nil {
			return err
		}
		http.SetCookie(w, sessions.NewCookie(session.Name(), "", session.Options))
		return nil
	}

	if session.ID == "" {
		// Generate a random session ID key suitable for storage in the DB
		session.ID = strings.TrimRight(
			base32.StdEncoding.EncodeToString(
				securecookie.GenerateRandomKey(32),
			), "=")
	}

	if err := db.save(session); err != nil {
		return err
	}

	// Keep the session ID key in a cookie so it can be looked up in DB later.
	encoded, err := securecookie.EncodeMulti(session.Name(), session.ID, db.Codecs...)
	if err != nil {
		return err
	}

	http.SetCookie(w, sessions.NewCookie(session.Name(), encoded, session.Options))
	return nil
}
