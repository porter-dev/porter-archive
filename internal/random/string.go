package random

import (
	"crypto/rand"
	"math/big"
)

const randCharset string = "abcdefghijklmnopqrstuvwxyz1234567890"

func StringWithCharset(length int, charset string) (string, error) {
	letters := charset

	if charset == "" {
		letters = randCharset
	}

	ret := make([]byte, length)
	for i := 0; i < length; i++ {
		num, err := rand.Int(rand.Reader, big.NewInt(int64(len(letters))))
		if err != nil {
			return "", err
		}
		ret[i] = letters[num.Int64()]
	}

	return string(ret), nil
}
