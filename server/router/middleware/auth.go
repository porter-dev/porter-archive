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
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
)

// Auth implements the authorization functions
type Auth struct {
	store      sessions.Store
	cookieName string
	repo       *repository.Repository
}

// NewAuth returns a new Auth instance
func NewAuth(
	store sessions.Store,
	cookieName string,
	repo *repository.Repository,
) *Auth {
	return &Auth{store, cookieName, repo}
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

type bodyUserID struct {
	UserID uint64 `json:"user_id"`
}

type bodyProjectID struct {
	ProjectID uint64 `json:"project_id"`
}

// DoesUserIDMatch checks the id URL parameter and verifies that it matches
// the one stored in the session
func (auth *Auth) DoesUserIDMatch(next http.Handler, loc IDLocation) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var err error
		id := findUserIDInRequest(r, loc)

		if err == nil && auth.doesSessionMatchID(r, uint(id)) {
			next.ServeHTTP(w, r)
		} else {
			http.Error(w, http.StatusText(http.StatusForbidden), http.StatusForbidden)
			return
		}

		return
	})
}

// AccessType represents the various access types for a project
type AccessType string

// The various access types
const (
	ReadAccess  AccessType = "read"
	WriteAccess AccessType = "write"
)

// DoesUserHaveProjectAccess looks for a project_id parameter and checks that the
// user has access via the specified accessType
func (auth *Auth) DoesUserHaveProjectAccess(
	next http.Handler,
	projLoc IDLocation,
	accessType AccessType,
) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var err error
		projID := uint(findProjIDInRequest(r, projLoc))

		session, err := auth.store.Get(r, auth.cookieName)

		if err != nil {
			http.Error(w, http.StatusText(http.StatusForbidden), http.StatusForbidden)
			return
		}

		userID, ok := session.Values["user_id"].(uint)

		if !ok {
			http.Error(w, http.StatusText(http.StatusForbidden), http.StatusForbidden)
			return
		}

		// get the project
		proj, err := auth.repo.Project.ReadProject(projID)

		if err != nil {
			http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
			return
		}

		// look for the user role in the project
		for _, role := range proj.Roles {
			if role.UserID == userID {
				if accessType == ReadAccess {
					next.ServeHTTP(w, r)
					return
				} else if accessType == WriteAccess {
					if role.Kind == models.RoleAdmin {
						next.ServeHTTP(w, r)
						return
					}
				}

			}
		}

		http.Error(w, http.StatusText(http.StatusForbidden), http.StatusForbidden)
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

func findUserIDInRequest(r *http.Request, userLoc IDLocation) uint64 {
	var userID uint64

	if userLoc == URLParam {
		userID, _ = strconv.ParseUint(chi.URLParam(r, "user_id"), 0, 64)
	} else if userLoc == BodyParam {
		form := &bodyUserID{}
		body, _ := ioutil.ReadAll(r.Body)
		_ = json.Unmarshal(body, form)

		userID = form.UserID

		// need to create a new stream for the body
		r.Body = ioutil.NopCloser(bytes.NewReader(body))
	}

	return userID
}

func findProjIDInRequest(r *http.Request, projLoc IDLocation) uint64 {
	var projID uint64

	if projLoc == URLParam {
		projID, _ = strconv.ParseUint(chi.URLParam(r, "project_id"), 0, 64)
	} else if projLoc == BodyParam {
		form := &bodyProjectID{}
		body, _ := ioutil.ReadAll(r.Body)
		_ = json.Unmarshal(body, form)

		projID = form.ProjectID

		// need to create a new stream for the body
		r.Body = ioutil.NopCloser(bytes.NewReader(body))
	}

	return projID
}
