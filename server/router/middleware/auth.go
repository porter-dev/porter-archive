package middleware

import (
	"net/http"

	"github.com/gorilla/sessions"
)

var (
	key   = []byte("secret")             // change to os.Getenv("SESSION_KEY")
	store = sessions.NewCookieStore(key) // Swap out with custom store
)

// Authenticate is middleware for authentication
func Authenticate(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if isLoggedIn(r) {
			next.ServeHTTP(w, r)
		} else {
			http.Error(w, http.StatusText(403), 403)
			return
		}

		return
	})
}

// Helpers

func isLoggedIn(r *http.Request) bool {
	session, _ := store.Get(r, "session-id")

	if auth, ok := session.Values["authenticated"].(bool); !auth || !ok {
		return false
	}
	return true
}
