package sessionstore_test

import (
	"encoding/base64"
	"net/http"
	"testing"

	"github.com/porter-dev/porter/internal/config"

	"github.com/gorilla/securecookie"
	"github.com/gorilla/sessions"
	"github.com/porter-dev/porter/internal/repository/test"

	"github.com/porter-dev/porter/internal/auth/sessionstore"
)

type headerOnlyResponseWriter http.Header

func (ho headerOnlyResponseWriter) Header() http.Header {
	return http.Header(ho)
}

func (ho headerOnlyResponseWriter) Write([]byte) (int, error) {
	panic("NOIMPL")
}

func (ho headerOnlyResponseWriter) WriteHeader(int) {
	panic("NOIMPL")
}

var secret = "secret"

func TestPGStore(t *testing.T) {
	repo := test.NewRepository(true)

	ss, err := sessionstore.NewStore(repo, config.ServerConf{
		CookieSecrets: []string{"secret"},
	})

	if err != nil {
		t.Fatal("Failed to get store", err)
	}

	// ROUND 1 - Check that the cookie is being saved
	req, err := http.NewRequest("GET", "http://www.example.com", nil)
	if err != nil {
		t.Fatal("failed to create request", err)
	}

	session, err := ss.Get(req, "mysess")
	if err != nil {
		t.Fatal("failed to get session", err.Error())
	}

	session.Values["counter"] = 1

	m := make(http.Header)
	if err = ss.Save(req, headerOnlyResponseWriter(m), session); err != nil {
		t.Fatal("Failed to save session:", err.Error())
	}

	if m["Set-Cookie"][0][0:6] != "mysess" {
		t.Fatal("Cookie wasn't set!")
	}

	// ROUND 2 - check that the cookie can be retrieved
	req, err = http.NewRequest("GET", "http://www.example.com", nil)
	if err != nil {
		t.Fatal("failed to create round 2 request", err)
	}

	encoded, err := securecookie.EncodeMulti(session.Name(), session.ID, ss.Codecs...)
	if err != nil {
		t.Fatal("Failed to make cookie value", err)
	}

	req.AddCookie(sessions.NewCookie(session.Name(), encoded, session.Options))

	session, err = ss.Get(req, "mysess")
	if err != nil {
		t.Fatal("failed to get round 2 session", err.Error())
	}

	if session.Values["counter"] != 1 {
		t.Fatal("Retrieved session had wrong value:", session.Values["counter"])
	}

	session.Values["counter"] = 9 // set new value for round 3
	if err = ss.Save(req, headerOnlyResponseWriter(m), session); err != nil {
		t.Fatal("Failed to save session:", err.Error())
	}

	// ROUND 2 - check that the cookie has been updated
	req, err = http.NewRequest("GET", "http://www.example.com", nil)
	if err != nil {
		t.Fatal("failed to create round 3 request", err)
	}
	req.AddCookie(sessions.NewCookie(session.Name(), encoded, session.Options))

	session, err = ss.Get(req, "mysess")
	if err != nil {
		t.Fatal("failed to get session round 3", err.Error())
	}

	if session.Values["counter"] != 9 {
		t.Fatal("Retrieved session had wrong value in round 3:", session.Values["counter"])
	}

	// ROUND 3 - Increase max length
	req, err = http.NewRequest("GET", "http://www.example.com", nil)
	if err != nil {
		t.Fatal("failed to create round 3 request", err)
	}

	req.AddCookie(sessions.NewCookie(session.Name(), encoded, session.Options))
	session, err = ss.New(req, "my session")
	if err != nil {
		t.Fatal("failed to create session", err)
	}

	session.Values["big"] = make([]byte, base64.StdEncoding.DecodedLen(4096*2))

	if err = ss.Save(req, headerOnlyResponseWriter(m), session); err == nil {
		t.Fatal("expected an error, got nil")
	}

	ss.MaxLength(4096 * 3) // A bit more than the value size to account for encoding overhead.
	if err = ss.Save(req, headerOnlyResponseWriter(m), session); err != nil {
		t.Fatal("Failed to save session:", err.Error())
	}
}

func TestSessionOptionsAreUniquePerSession(t *testing.T) {
	repo := test.NewRepository(true)

	ss, err := sessionstore.NewStore(repo, config.ServerConf{
		CookieSecrets: []string{"secret"},
	})

	if err != nil {
		t.Fatal("Failed to get store", err)
	}

	ss.Options.MaxAge = 900

	req, err := http.NewRequest("GET", "http://www.example.com", nil)
	if err != nil {
		t.Fatal("Failed to create request", err)
	}

	session, err := ss.Get(req, "newsess")
	if err != nil {
		t.Fatal("Failed to create session", err)
	}

	session.Options.MaxAge = -1

	if ss.Options.MaxAge != 900 {
		t.Fatalf("PGStore.Options.MaxAge: expected %d, got %d", 900, ss.Options.MaxAge)
	}
}
