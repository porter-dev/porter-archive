package main

import (
	"fmt"
	"net/http"

	"github.com/porter-dev/porter/internal/config"

	dbConn "github.com/porter-dev/porter/internal/adapter"
	sessionstore "github.com/porter-dev/porter/internal/auth"
)

var appConf = config.AppConfig()

var db, dbErr = dbConn.New(&appConf.Db)

var (
	key      = []byte("secret") // change to os.Getenv("SESSION_KEY")
	store, _ = sessionstore.NewStore(db, key)
)

func secret(w http.ResponseWriter, r *http.Request) {

	session, _ := store.Get(r, "cookie-name")
	fmt.Println(session.Values["authenticated"])

	// Check if user is authenticated
	if auth, ok := session.Values["authenticated"].(bool); !ok || !auth {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	// Print secret message
	fmt.Fprintln(w, "The cake is a lie!")
}

func login(w http.ResponseWriter, r *http.Request) {
	session, _ := store.Get(r, "cookie-name")

	// Authentication goes here
	// ...

	// Set user as authenticated
	session.Values["authenticated"] = true
	session.Save(r, w)
}

func logout(w http.ResponseWriter, r *http.Request) {
	session, _ := store.Get(r, "cookie-name")

	// Revoke users authentication
	session.Values["authenticated"] = false
	session.Save(r, w)
}

func main() {
	http.HandleFunc("/secret", secret)
	http.HandleFunc("/login", login)
	http.HandleFunc("/logout", logout)

	http.ListenAndServe(":8080", nil)
}
