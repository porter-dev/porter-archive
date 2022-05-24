// Package sessionstore is a postgresql backend implementation of gorilla/sessions Session interface, based on
// antonlindstrom/pgstore. Key change is to use GORM instead of typical sql driver using queries.
package sessionstore

import (
	"encoding/base32"
	"net/http"
	"strings"
	"time"

	"github.com/gorilla/securecookie"
	"github.com/gorilla/sessions"

	"github.com/porter-dev/porter/api/server/shared/config/env"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"

	"gorm.io/gorm"
)

// structs

// PGStore is a wrapper around gorilla/sessions store.
type PGStore struct {
	Codecs  []securecookie.Codec
	Options *sessions.Options
	Path    string
	Repo    repository.SessionRepository
}

// Helpers

// MaxLength restricts the maximum length of new sessions to l.
// If l is 0 there is no limit to the size of a session, use with caution.
// The default for a new PGStore is 4096. PostgreSQL allows for max
// value sizes of up to 1GB (http://www.postgresql.org/docs/current/interactive/datatype-character.html)
func (store *PGStore) MaxLength(l int) {
	for _, c := range store.Codecs {
		if codec, ok := c.(*securecookie.SecureCookie); ok {
			codec.MaxLength(l)
		}
	}
}

// MaxAge sets the maximum age for the store and the underlying cookie
// implementation. Individual sessions can be deleted by setting Options.MaxAge
// = -1 for that session.
func (store *PGStore) MaxAge(age int) {
	store.Options.MaxAge = age

	// Set the maxAge for each securecookie instance.
	for _, codec := range store.Codecs {
		if sc, ok := codec.(*securecookie.SecureCookie); ok {
			sc.MaxAge(age)
		}
	}
}

// load fetches a session by ID from the database and decodes its content
// into session.Values.
func (store *PGStore) load(session *sessions.Session) error {
	res, err := store.Repo.SelectSession(&models.Session{Key: session.ID})

	if err != nil {
		return err
	}

	return securecookie.DecodeMulti(session.Name(), string(res.Data), &session.Values, store.Codecs...)
}

// save writes encoded session.Values to a database record.
// writes to http_sessions table by default.
func (store *PGStore) save(session *sessions.Session) error {
	encoded, err := securecookie.EncodeMulti(session.Name(), session.Values, store.Codecs...)
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

	s := &models.Session{
		Key:       session.ID,
		Data:      []byte(encoded),
		ExpiresAt: expiresOn,
	}

	repo := store.Repo

	if session.IsNew {
		_, createErr := repo.CreateSession(s)
		return createErr
	}

	_, updateErr := repo.UpdateSession(s)
	return updateErr
}

// Implementation of the interface (Get, New, Save)

type NewStoreOpts struct {
	SessionRepository repository.SessionRepository
	CookieSecrets     []string

	Insecure bool
}

// NewStore takes an initialized db and session key pairs to create a session-store in postgres db.
func NewStore(opts *NewStoreOpts) (*PGStore, error) {
	keyPairs := [][]byte{}

	for _, key := range opts.CookieSecrets {
		keyPairs = append(keyPairs, []byte(key))
	}

	dbStore := &PGStore{
		Codecs: securecookie.CodecsFromPairs(keyPairs...),
		Options: &sessions.Options{
			Path:     "/",
			MaxAge:   86400 * 30,
			Secure:   !opts.Insecure,
			HttpOnly: true,
			SameSite: http.SameSiteLaxMode,
		},
		Repo: opts.SessionRepository,
	}

	return dbStore, nil
}

// NewFilesystemStore takes session key pairs to create a session-store in the local fs without using a db.
func NewFilesystemStore(conf env.ServerConf) *sessions.FilesystemStore {
	keyPairs := [][]byte{}

	for _, key := range conf.CookieSecrets {
		keyPairs = append(keyPairs, []byte(key))
	}

	// Defaults to os.TempDir() when first argument (path) isn't specified.
	store := sessions.NewFilesystemStore("", keyPairs...)

	return store
}

// Get Fetches a session for a given name after it has been added to the
// registry.
func (store *PGStore) Get(r *http.Request, name string) (*sessions.Session, error) {
	return sessions.GetRegistry(r).Get(store, name)
}

// New returns a new session for the given name without adding it to the registry.
func (store *PGStore) New(r *http.Request, name string) (*sessions.Session, error) {
	session := sessions.NewSession(store, name)
	if session == nil {
		return nil, nil
	}

	opts := *store.Options
	session.Options = &(opts)
	session.IsNew = true

	var err error
	if c, errCookie := r.Cookie(name); errCookie == nil {
		err = securecookie.DecodeMulti(name, c.Value, &session.ID, store.Codecs...)
		if err == nil {
			err = store.load(session)

			if err != nil {
				if err == gorm.ErrRecordNotFound {
					err = nil
				} else if strings.Contains(err.Error(), "expired timestamp") {
					err = nil
					session.IsNew = false
				}
			} else {
				session.IsNew = false
			}
		}
	}

	store.MaxAge(store.Options.MaxAge)

	return session, err
}

// Save saves the given session into the database and deletes cookies if needed
func (store *PGStore) Save(r *http.Request, w http.ResponseWriter, session *sessions.Session) error {
	repo := store.Repo

	// Set delete if max-age is < 0
	if session.Options.MaxAge < 0 {
		if _, err := repo.DeleteSession(&models.Session{Key: session.ID}); err != nil {
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

	if err := store.save(session); err != nil {
		return err
	}

	// Keep the session ID key in a cookie so it can be looked up in DB later.
	encoded, err := securecookie.EncodeMulti(session.Name(), session.ID, store.Codecs...)
	if err != nil {
		return err
	}

	http.SetCookie(w, sessions.NewCookie(session.Name(), encoded, session.Options))
	return nil
}
