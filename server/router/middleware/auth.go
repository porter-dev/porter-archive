package middleware

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io/ioutil"
	"net/http"
	"net/url"
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
	// URLParam location looks for a parameter in the URL endpoint
	URLParam IDLocation = iota
	// BodyParam location looks for a parameter in the body
	BodyParam
	// QueryParam location looks for a parameter in the query string
	QueryParam
)

type bodyUserID struct {
	UserID uint64 `json:"user_id"`
}

type bodyProjectID struct {
	ProjectID uint64 `json:"project_id"`
}

type bodyClusterID struct {
	ClusterID uint64 `json:"cluster_id"`
}

// DoesUserIDMatch checks the id URL parameter and verifies that it matches
// the one stored in the session
func (auth *Auth) DoesUserIDMatch(next http.Handler, loc IDLocation) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var err error
		id, err := findUserIDInRequest(r, loc)

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
		projID, err := findProjIDInRequest(r, projLoc)

		if err != nil {
			http.Error(w, http.StatusText(http.StatusForbidden), http.StatusForbidden)
			return
		}

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
		proj, err := auth.repo.Project.ReadProject(uint(projID))

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

// DoesUserHaveClusterAccess looks for a project_id parameter and a
// cluster_id parameter, and verifies that the cluster belongs
// to the project
func (auth *Auth) DoesUserHaveClusterAccess(
	next http.Handler,
	projLoc IDLocation,
	clusterLoc IDLocation,
) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		clusterID, err := findClusterIDInRequest(r, clusterLoc)

		if err != nil {
			http.Error(w, http.StatusText(http.StatusForbidden), http.StatusForbidden)
			return
		}

		projID, err := findProjIDInRequest(r, projLoc)

		if err != nil {
			http.Error(w, http.StatusText(http.StatusForbidden), http.StatusForbidden)
			return
		}

		// get the service accounts belonging to the project
		clusters, err := auth.repo.Cluster.ListClustersByProjectID(uint(projID))

		if err != nil {
			http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
			return
		}

		doesExist := false

		for _, cluster := range clusters {
			if cluster.ID == uint(clusterID) {
				doesExist = true
				break
			}
		}

		if doesExist {
			next.ServeHTTP(w, r)
			return
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

func findUserIDInRequest(r *http.Request, userLoc IDLocation) (uint64, error) {
	var userID uint64
	var err error

	if userLoc == URLParam {
		userID, err = strconv.ParseUint(chi.URLParam(r, "user_id"), 0, 64)

		if err != nil {
			return 0, err
		}
	} else if userLoc == BodyParam {
		form := &bodyUserID{}
		body, err := ioutil.ReadAll(r.Body)

		if err != nil {
			return 0, err
		}

		err = json.Unmarshal(body, form)

		if err != nil {
			return 0, err
		}

		userID = form.UserID

		// need to create a new stream for the body
		r.Body = ioutil.NopCloser(bytes.NewReader(body))
	} else {
		vals, err := url.ParseQuery(r.URL.RawQuery)

		if err != nil {
			return 0, err
		}

		if userStrArr, ok := vals["user_id"]; ok && len(userStrArr) == 1 {
			userID, err = strconv.ParseUint(userStrArr[0], 10, 64)
		} else {
			return 0, errors.New("user id not found")
		}
	}

	return userID, nil
}

func findProjIDInRequest(r *http.Request, projLoc IDLocation) (uint64, error) {
	var projID uint64
	var err error

	if projLoc == URLParam {
		projID, err = strconv.ParseUint(chi.URLParam(r, "project_id"), 0, 64)

		if err != nil {
			return 0, err
		}
	} else if projLoc == BodyParam {
		form := &bodyProjectID{}
		body, err := ioutil.ReadAll(r.Body)

		if err != nil {
			return 0, err
		}

		err = json.Unmarshal(body, form)

		if err != nil {
			return 0, err
		}

		projID = form.ProjectID

		// need to create a new stream for the body
		r.Body = ioutil.NopCloser(bytes.NewReader(body))
	} else {
		vals, err := url.ParseQuery(r.URL.RawQuery)

		if err != nil {
			return 0, err
		}

		if projStrArr, ok := vals["project_id"]; ok && len(projStrArr) == 1 {
			projID, err = strconv.ParseUint(projStrArr[0], 10, 64)
		} else {
			return 0, errors.New("project id not found")
		}
	}

	return projID, nil
}

func findClusterIDInRequest(r *http.Request, clusterLoc IDLocation) (uint64, error) {
	var clusterID uint64
	var err error

	if clusterLoc == URLParam {
		clusterID, err = strconv.ParseUint(chi.URLParam(r, "cluster_id"), 0, 64)

		if err != nil {
			return 0, err
		}
	} else if clusterLoc == BodyParam {
		form := &bodyClusterID{}
		body, err := ioutil.ReadAll(r.Body)

		if err != nil {
			return 0, err
		}

		err = json.Unmarshal(body, form)

		if err != nil {
			return 0, err
		}

		clusterID = form.ClusterID

		// need to create a new stream for the body
		r.Body = ioutil.NopCloser(bytes.NewReader(body))
	} else {
		vals, err := url.ParseQuery(r.URL.RawQuery)

		if err != nil {
			return 0, err
		}

		if clStrArr, ok := vals["cluster_id"]; ok && len(clStrArr) == 1 {
			clusterID, err = strconv.ParseUint(clStrArr[0], 10, 64)
		} else {
			return 0, errors.New("cluster id not found")
		}
	}

	return clusterID, nil
}
