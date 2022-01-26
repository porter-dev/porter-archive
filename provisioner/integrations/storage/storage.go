package storage

import (
	"fmt"

	"github.com/porter-dev/porter/internal/models"
)

var FileDoesNotExist error = fmt.Errorf("the specified file does not exist")

type StorageManager interface {
	WriteFile(infra *models.Infra, name string, bytes []byte) error
	ReadFile(infra *models.Infra, name string) ([]byte, error)
	DeleteFile(infra *models.Infra, name string) error
}
