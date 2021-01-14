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

	// The URI of the repository
	URI string `json:"uri"`
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
		return r.listGCRRepositories(repo)
	}

	return nil, fmt.Errorf("error listing repositories")
}

type gcrJWT struct {
	AccessToken  string `json:"token"`
	ExpiresInSec int    `json:"expires_in"`
}

type gcrRepositoryResp struct {
	Repositories []string `json:"repositories"`
}

func (r *Registry) GetGCRToken(repo repository.Repository) (*ints.TokenCache, error) {
	gcp, err := repo.GCPIntegration.ReadGCPIntegration(
		r.GCPIntegrationID,
	)

	if err != nil {
		return nil, err
	}

	// get oauth2 access token
	_, err = gcp.GetBearerToken(r.getTokenCache, r.setTokenCacheFunc(repo))

	if err != nil {
		return nil, err
	}

	// it's now written to the token cache, so return
	cache, err := r.getTokenCache()

	if err != nil {
		return nil, err
	}

	return cache, nil
}

func (r *Registry) listGCRRepositories(
	repo repository.Repository,
) ([]*Repository, error) {
	gcp, err := repo.GCPIntegration.ReadGCPIntegration(
		r.GCPIntegrationID,
	)

	if err != nil {
		return nil, err
	}

	// Just use service account key to authenticate, since scopes may not be in place
	// for oauth. This also prevents us from making more requests.
	client := &http.Client{}

	req, err := http.NewRequest(
		"GET",
		"https://gcr.io/v2/_catalog",
		nil,
	)

	if err != nil {
		return nil, err
	}

	req.SetBasicAuth("_json_key", string(gcp.GCPKeyData))

	resp, err := client.Do(req)

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
			URI:  r.URL + "/" + repo,
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
			URI:       *repo.RepositoryUri,
		})
	}

	return res, nil
}

func (r *Registry) getTokenCache() (tok *ints.TokenCache, err error) {
	return &ints.TokenCache{
		Token:  r.TokenCache.Token,
		Expiry: r.TokenCache.Expiry,
	}, nil
}

func (r *Registry) setTokenCacheFunc(
	repo repository.Repository,
) ints.SetTokenCacheFunc {
	return func(token string, expiry time.Time) error {
		_, err := repo.Registry.UpdateRegistryTokenCache(
			&ints.RegTokenCache{
				TokenCache: ints.TokenCache{
					Token:  []byte(token),
					Expiry: expiry,
				},
				RegistryID: r.ID,
			},
		)

		return err
	}
}

// ListImages lists the images for an image repository
func (r *Registry) ListImages(
	repoName string,
	repo repository.Repository,
) ([]*Image, error) {
	// switch on the auth mechanism to get a token
	if r.AWSIntegrationID != 0 {
		return r.listECRImages(repoName, repo)
	}

	if r.GCPIntegrationID != 0 {
		return r.listGCRImages(repoName, repo)
	}

	return nil, fmt.Errorf("error listing images")
}

func (r *Registry) listECRImages(repoName string, repo repository.Repository) ([]*Image, error) {
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

	resp, err := svc.ListImages(&ecr.ListImagesInput{
		RepositoryName: &repoName,
	})

	if err != nil {
		return nil, err
	}

	res := make([]*Image, 0)

	for _, img := range resp.ImageIds {
		res = append(res, &Image{
			Digest:         *img.ImageDigest,
			Tag:            *img.ImageTag,
			RepositoryName: repoName,
		})
	}

	return res, nil
}

type gcrImageResp struct {
	Tags []string `json:"tags"`
}

func (r *Registry) listGCRImages(repoName string, repo repository.Repository) ([]*Image, error) {
	gcp, err := repo.GCPIntegration.ReadGCPIntegration(
		r.GCPIntegrationID,
	)

	if err != nil {
		return nil, err
	}

	// use JWT token to request catalog
	client := &http.Client{}

	req, err := http.NewRequest(
		"GET",
		fmt.Sprintf("https://gcr.io/v2/%s/tags/list", repoName),
		nil,
	)

	if err != nil {
		return nil, err
	}

	req.SetBasicAuth("_json_key", string(gcp.GCPKeyData))

	resp, err := client.Do(req)

	if err != nil {
		return nil, err
	}

	gcrResp := gcrImageResp{}

	if err := json.NewDecoder(resp.Body).Decode(&gcrResp); err != nil {
		return nil, fmt.Errorf("Could not read GCR repositories: %v", err)
	}

	res := make([]*Image, 0)

	for _, tag := range gcrResp.Tags {
		res = append(res, &Image{
			RepositoryName: repoName,
			Tag:            tag,
		})
	}

	return res, nil
}
