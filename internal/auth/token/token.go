package token

import (
	"fmt"
	"strconv"
	"time"

	"github.com/dgrijalva/jwt-go"
)

type Subject string

const (
	User Subject = "user"
	API  Subject = "api"
)

type TokenGeneratorConf struct {
	TokenSecret string
}

type Token struct {
	SubKind   Subject
	Sub       string
	ProjectID uint
	IBy       uint
	IAt       *time.Time
}

func (t *Token) GetTokenForUser(userID, projID uint) (*Token, error) {
	if userID == 0 || projID == 0 {
		return nil, fmt.Errorf("id cannot be 0")
	}

	iat := time.Now()

	return &Token{
		SubKind:   User,
		Sub:       fmt.Sprintf("%d", userID),
		ProjectID: projID,
		IBy:       userID,
		IAt:       &iat,
	}, nil
}

func (t *Token) GetTokenForAPI(userID, projID uint) (*Token, error) {
	if userID == 0 || projID == 0 {
		return nil, fmt.Errorf("id cannot be 0")
	}

	iat := time.Now()

	return &Token{
		SubKind:   API,
		Sub:       string(API),
		ProjectID: projID,
		IBy:       userID,
		IAt:       &iat,
	}, nil
}

func (t *Token) EncodeToken(conf *TokenGeneratorConf) (string, error) {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub_kind":   t.SubKind,
		"sub":        t.Sub,
		"iby":        t.IBy,
		"iat":        t.IAt.Unix(),
		"project_id": t.ProjectID,
	})

	// Sign and get the complete encoded token as a string using the secret
	return token.SignedString(conf.TokenSecret)
}

func GetTokenFromEncoded(tokenString string, conf *TokenGeneratorConf) (*Token, error) {
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("Unexpected signing method: %v", token.Header["alg"])
		}

		return conf.TokenSecret, nil
	})

	if err != nil {
		return nil, fmt.Errorf("could not parse token")
	}

	if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
		iby, err := strconv.ParseUint(fmt.Sprintf("%v", claims["iby"]), 10, 64)

		if err != nil {
			return nil, fmt.Errorf("invalid iby claim")
		}

		projID, err := strconv.ParseUint(fmt.Sprintf("%v", claims["project_id"]), 10, 64)

		if err != nil {
			return nil, fmt.Errorf("invalid iby claim")
		}

		iatUnix, err := strconv.ParseInt(fmt.Sprintf("%v", claims["iat"]), 10, 64)

		if err != nil {
			return nil, fmt.Errorf("invalid iby claim")
		}

		iat := time.Unix(iatUnix, 0)

		return &Token{
			SubKind:   Subject(fmt.Sprintf("%v", claims["sub_kind"])),
			Sub:       fmt.Sprintf("%v", claims["sub"]),
			IBy:       uint(iby),
			IAt:       &iat,
			ProjectID: uint(projID),
		}, nil
	}

	return nil, fmt.Errorf("invalid token")
}
