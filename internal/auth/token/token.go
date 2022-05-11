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
	SubKind   Subject    `json:"sub_kind"`
	Sub       string     `json:"sub"`
	ProjectID uint       `json:"project_id"`
	IBy       uint       `json:"iby"`
	IAt       *time.Time `json:"iat"`

	// Additional fields that may or may not be set
	TokenID string `json:"token_id"`
	Secret  string `json:"secret"`
}

func GetTokenForUser(userID uint) (*Token, error) {
	if userID == 0 {
		return nil, fmt.Errorf("id cannot be 0")
	}

	iat := time.Now()

	return &Token{
		SubKind: User,
		Sub:     fmt.Sprintf("%d", userID),
		IBy:     userID,
		IAt:     &iat,
	}, nil
}

func GetTokenForAPI(userID, projID uint) (*Token, error) {
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

func GetStoredTokenForAPI(userID, projID uint, tokenID, secret string) (*Token, error) {
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
		TokenID:   tokenID,
		Secret:    secret,
	}, nil
}

func (t *Token) EncodeToken(conf *TokenGeneratorConf) (string, error) {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub_kind":   t.SubKind,
		"sub":        t.Sub,
		"iby":        t.IBy,
		"iat":        fmt.Sprintf("%d", t.IAt.Unix()),
		"project_id": t.ProjectID,
		"token_id":   t.TokenID,
		"secret":     t.Secret,
	})

	// Sign and get the complete encoded token as a string using the secret
	return token.SignedString([]byte(conf.TokenSecret))
}

func GetTokenFromEncoded(tokenString string, conf *TokenGeneratorConf) (*Token, error) {
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("Unexpected signing method: %v", token.Header["alg"])
		}

		return []byte(conf.TokenSecret), nil
	})

	if err != nil {
		return nil, fmt.Errorf("could not parse token: %v", err)
	}

	if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
		iby, err := strconv.ParseUint(fmt.Sprintf("%v", claims["iby"]), 10, 64)

		if err != nil {
			return nil, fmt.Errorf("invalid iby claim: %v", err)
		}

		projID, err := strconv.ParseUint(fmt.Sprintf("%v", claims["project_id"]), 10, 64)

		if err != nil {
			return nil, fmt.Errorf("invalid project_id claim: %v", err)
		}

		iatUnix, err := strconv.ParseInt(fmt.Sprintf("%v", claims["iat"]), 10, 64)

		if err != nil {
			return nil, fmt.Errorf("invalid iat claim: %v", err)
		}

		iat := time.Unix(iatUnix, 0)

		res := &Token{
			SubKind:   Subject(fmt.Sprintf("%v", claims["sub_kind"])),
			Sub:       fmt.Sprintf("%v", claims["sub"]),
			IBy:       uint(iby),
			IAt:       &iat,
			ProjectID: uint(projID),
		}

		if tokenIDInter, ok := claims["token_id"]; ok {
			tokenID, ok := tokenIDInter.(string)

			if ok {
				res.TokenID = tokenID
			}
		}

		if secretInter, ok := claims["secret"]; ok {
			secret, ok := secretInter.(string)

			if ok {
				res.Secret = secret
			}
		}

		return res, nil
	}

	return nil, fmt.Errorf("invalid token")
}
