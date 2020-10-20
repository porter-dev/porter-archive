package middleware

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"strconv"

	"github.com/go-chi/chi"
	"github.com/gorilla/sessions"
)

// Auth implements the authorization functions
type Auth struct {
	store      sessions.Store
	cookieName string
}

// NewAuth returns a new Auth instance
func NewAuth(
	store sessions.Store,
	cookieName string,
) *Auth {
	return &Auth{store, cookieName}
}

// BasicAuthenticate just checks that a user is logged in
func (auth *Auth) BasicAuthenticate(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if auth.isLoggedIn(w, r) {
			next.ServeHTTP(w, r)
		} else {
			http.Error(w, http.StatusText(http.StatusForbidden), http.StatusForbidden)
			return
		}

		return
	})
}

// IDLocation represents the location of the ID to use for authentication
type IDLocation uint

const (
	// URLParam location looks for {id} in the URL
	URLParam IDLocation = iota
	// BodyParam location looks for user_id in the body
	BodyParam
)

type bodyID struct {
	UserID uint64 `json:"user_id"`
}

// DoesUserIDMatch checks the id URL parameter and verifies that it matches
// the one stored in the session
func (auth *Auth) DoesUserIDMatch(next http.Handler, loc IDLocation) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var id uint64
		var err error

		if loc == URLParam {
			id, err = strconv.ParseUint(chi.URLParam(r, "id"), 0, 64)
		} else if loc == BodyParam {
			form := &bodyID{}
			body, _ := ioutil.ReadAll(r.Body)
			err = json.Unmarshal(body, form)

			id = form.UserID

			// need to create a new stream for the body
			r.Body = ioutil.NopCloser(bytes.NewReader(body))
		}

		if err == nil && auth.doesSessionMatchID(r, uint(id)) {
			next.ServeHTTP(w, r)
		} else {
			http.Error(w, http.StatusText(http.StatusForbidden), http.StatusForbidden)
			return
		}

		return
	})
}

// Helpers
func (auth *Auth) doesSessionMatchID(r *http.Request, id uint) bool {
	session, _ := auth.store.Get(r, auth.cookieName)

	if sessID, ok := session.Values["user_id"].(uint); !ok || sessID != id {
		return false
	}

	return true
}

func (auth *Auth) isLoggedIn(w http.ResponseWriter, r *http.Request) bool {
	session, err := auth.store.Get(r, auth.cookieName)
	if err != nil {
		session.Values["authenticated"] = false
		if err := session.Save(r, w); err != nil {
			fmt.Println("error while saving session in isLoggedIn", err)
		}
		return false
	}

	if auth, ok := session.Values["authenticated"].(bool); !auth || !ok {
		return false
	}
	return true
}
