package registry

import (
	"fmt"
	"time"

	"github.com/aws/aws-sdk-go/service/ecr"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
)

// Registry wraps the gorm Registry model
type Registry models.Registry

// Repository is a collection of images
type Repository struct {
	// Name of the repository
	Name string `json:"name"`

	// When the repository was created
	CreatedAt time.Time `json:"created_at,omitempty"`
}

// Image is a Docker image type
type Image struct {
	// The sha256 digest of the image manifest.
	Digest string `json:"digest"`

	// The tag used for the image.
	Tag string `json:"tag"`

	// The image manifest associated with the image.
	Manifest string `json:"manifest"`

	// The name of the repository associated with the image.
	RepositoryName string `json:"repository_name"`
}

// ListRepositories lists the repositories for a registry
func (r *Registry) ListRepositories(repo repository.Repository) ([]*Repository, error) {
	// switch on the auth mechanism to get a token
	if r.AWSIntegrationID != 0 {
		return r.listECRRepositories(repo.AWSIntegration)
	}

	return nil, fmt.Errorf("error listing repositories")
}

// ListImages lists the images for an image repository
func (r *Registry) ListImages(
	repo repository.Repository,
	regName string,
) ([]*Image, error) {
	return nil, nil
}

func (r *Registry) listECRRepositories(repo repository.AWSIntegrationRepository) ([]*Repository, error) {
	aws, err := repo.ReadAWSIntegration(
		r.AWSIntegrationID,
	)

	if err != nil {
		return nil, err
	}

	sess, err := aws.GetSession()

	if err != nil {
		return nil, err
	}

	svc := ecr.New(sess)

	resp, err := svc.DescribeRepositories(&ecr.DescribeRepositoriesInput{})

	if err != nil {
		return nil, err
	}

	res := make([]*Repository, 0)

	for _, repo := range resp.Repositories {
		res = append(res, &Repository{
			Name:      *repo.RepositoryName,
			CreatedAt: *repo.CreatedAt,
		})
	}

	return res, nil
}
