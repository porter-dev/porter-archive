package token_test

import (
	"testing"
	"time"

	"github.com/go-test/deep"
	"github.com/porter-dev/porter/internal/auth/token"
)

func TestGetAndEncodeTokenForUser(t *testing.T) {
	conf := &token.TokenGeneratorConf{
		TokenSecret: "fakesecret",
	}

	tok, err := token.GetTokenForUser(1)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	tokString, err := tok.EncodeToken(conf)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	// decode the token again and compare
	expToken := &token.Token{
		SubKind: token.User,
		Sub:     "1",
		IBy:     1,
	}

	gotToken, err := token.GetTokenFromEncoded(tokString, conf)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	if now := time.Now(); now.Sub(*gotToken.IAt) < 5 && now.Sub(*gotToken.IAt) >= 0 {
		t.Fatalf("time not within threshold: issued at %d, current time %d\n", gotToken.IAt.Unix(), now.Unix())
	}

	gotToken.IAt = nil

	if diff := deep.Equal(expToken, gotToken); diff != nil {
		t.Errorf("tokens not equal:")
		t.Error(diff)
	}
}
