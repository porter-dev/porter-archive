package storage

import "github.com/porter-dev/porter/internal/models"

type StorageManager interface {
	WriteFile(infra *models.Infra, name string, bytes []byte) error
	ReadFile(infra *models.Infra, name string) ([]byte, error)
	DeleteFile(infra *models.Infra, name string) error
}
