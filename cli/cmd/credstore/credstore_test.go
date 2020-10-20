package credstore_test

import (
	"log"
	"testing"

	"github.com/porter-dev/porter/cli/cmd/credstore"
)

func TestSetGet(t *testing.T) {
	credstore.Set("user", "password")

	user, secret, err := credstore.Get()
	if err == nil {
		if user != "user" {
			t.Errorf("Expecting user, got %s", user)
		}

		if secret != "password" {
			t.Errorf("Expecting password, got %s", secret)
		}
	} else {
		log.Println("got error:", err)
	}

	credstore.Del()

	_, _, err = credstore.Get()

	if err == nil {
		t.Fatalf("Expecting an error, got nil")
	}

}
