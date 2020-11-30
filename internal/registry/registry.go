package registry

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/aws/aws-sdk-go/service/ecr"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"

	ints "github.com/porter-dev/porter/internal/models/integrations"
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
		return r.listECRRepositories(repo)
	}

	if r.GCPIntegrationID != 0 {
		return r.listGCPRepositories(repo)
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

type gcrJWT struct {
	AccessToken  string `json:"token"`
	ExpiresInSec int    `json:"expires_in"`
}

type gcrRepositoryResp struct {
	Repositories []string `json:"repositories"`
}

// TODO -- use a token cache for the JWT token as well
func (r *Registry) listGCPRepositories(
	repo repository.Repository,
) ([]*Repository, error) {
	gcp, err := repo.GCPIntegration.ReadGCPIntegration(
		r.GCPIntegrationID,
	)

	if err != nil {
		return nil, err
	}

	// get oauth2 access token
	oauthTok, err := gcp.GetBearerToken(r.getTokenCache, r.setTokenCacheFunc(repo))

	if err != nil {
		return nil, err
	}

	// get jwt token
	client := &http.Client{}

	req, err := http.NewRequest(
		"GET",
		"https://gcr.io/v2/token?service=gcr.io&scope=registry:catalog:*",
		nil,
	)

	req.SetBasicAuth("_token", oauthTok)

	resp, err := client.Do(req)

	if err != nil {
		return nil, err
	}

	jwtSource := gcrJWT{}

	if err := json.NewDecoder(resp.Body).Decode(&jwtSource); err != nil {
		return nil, fmt.Errorf("Invalid token JSON from metadata: %v", err)
	}

	// use JWT token to request catalog
	req, err = http.NewRequest(
		"GET",
		"https://gcr.io/v2/_catalog",
		nil,
	)

	req.Header.Add("Authorization", "Bearer "+jwtSource.AccessToken)

	resp, err = client.Do(req)

	if err != nil {
		return nil, err
	}

	gcrResp := gcrRepositoryResp{}

	if err := json.NewDecoder(resp.Body).Decode(&gcrResp); err != nil {
		return nil, fmt.Errorf("Could not read GCR repositories: %v", err)
	}

	res := make([]*Repository, 0)

	for _, repo := range gcrResp.Repositories {
		res = append(res, &Repository{
			Name: repo,
		})
	}

	return res, nil
}

func (r *Registry) listECRRepositories(repo repository.Repository) ([]*Repository, error) {
	aws, err := repo.AWSIntegration.ReadAWSIntegration(
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

func (r *Registry) getTokenCache() (tok *ints.TokenCache, err error) {
	return &r.TokenCache, nil
}

func (r *Registry) setTokenCacheFunc(
	repo repository.Repository,
) ints.SetTokenCacheFunc {
	return func(token string, expiry time.Time) error {
		_, err := repo.Registry.UpdateRegistryTokenCache(
			&ints.TokenCache{
				RegistryID: r.ID,
				Token:      []byte(token),
				Expiry:     expiry,
			},
		)

		return err
	}
}
