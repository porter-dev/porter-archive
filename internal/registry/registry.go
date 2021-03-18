package registry

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go/service/ecr"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/oauth"
	"github.com/porter-dev/porter/internal/repository"
	"golang.org/x/oauth2"

	ints "github.com/porter-dev/porter/internal/models/integrations"

	"github.com/digitalocean/godo"
	"github.com/docker/cli/cli/config/configfile"
	"github.com/docker/cli/cli/config/types"
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
func (r *Registry) ListRepositories(
	repo repository.Repository,
	doAuth *oauth2.Config, // only required if using DOCR
) ([]*Repository, error) {
	// switch on the auth mechanism to get a token
	if r.AWSIntegrationID != 0 {
		return r.listECRRepositories(repo)
	}

	if r.GCPIntegrationID != 0 {
		return r.listGCRRepositories(repo)
	}

	if r.DOIntegrationID != 0 {
		return r.listDOCRRepositories(repo, doAuth)
	}

	if r.BasicIntegrationID != 0 {
		return r.listPrivateRegistryRepositories(repo)
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
	_, err = gcp.GetBearerToken(
		r.getTokenCache,
		r.setTokenCacheFunc(repo),
		"https://www.googleapis.com/auth/devstorage.read_write",
	)

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

	parsedURL, err := url.Parse("https://" + r.URL)

	if err != nil {
		return nil, err
	}

	for _, repo := range gcrResp.Repositories {
		res = append(res, &Repository{
			Name: repo,
			URI:  parsedURL.Host + "/" + repo,
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

func (r *Registry) listDOCRRepositories(
	repo repository.Repository,
	doAuth *oauth2.Config,
) ([]*Repository, error) {
	oauthInt, err := repo.OAuthIntegration.ReadOAuthIntegration(
		r.DOIntegrationID,
	)

	if err != nil {
		return nil, err
	}

	tok, _, err := oauth.GetAccessToken(oauthInt, doAuth, repo)

	if err != nil {
		return nil, err
	}

	client := godo.NewFromToken(tok)

	urlArr := strings.Split(r.URL, "/")

	if len(urlArr) != 2 {
		return nil, fmt.Errorf("invalid digital ocean registry url")
	}

	name := urlArr[1]

	repos, _, err := client.Registry.ListRepositories(context.TODO(), name, &godo.ListOptions{})

	if err != nil {
		return nil, err
	}

	res := make([]*Repository, 0)

	for _, repo := range repos {
		res = append(res, &Repository{
			Name: repo.Name,
			URI:  r.URL + "/" + repo.Name,
		})
	}

	return res, nil
}

func (r *Registry) listPrivateRegistryRepositories(
	repo repository.Repository,
) ([]*Repository, error) {
	// handle dockerhub different, as it doesn't implement the docker registry http api
	if strings.Contains(r.URL, "docker.io") {
		// in this case, we just return the single dockerhub repository that's linked
		res := make([]*Repository, 0)

		res = append(res, &Repository{
			Name: strings.Split(r.URL, "docker.io/")[1],
			URI:  r.URL,
		})

		return res, nil
	}

	basic, err := repo.BasicIntegration.ReadBasicIntegration(
		r.BasicIntegrationID,
	)

	if err != nil {
		return nil, err
	}

	// Just use service account key to authenticate, since scopes may not be in place
	// for oauth. This also prevents us from making more requests.
	client := &http.Client{}

	// get the host and scheme to make the request
	parsedURL, err := url.Parse(r.URL)

	req, err := http.NewRequest(
		"GET",
		fmt.Sprintf("%s://%s/v2/_catalog", parsedURL.Scheme, parsedURL.Host),
		nil,
	)

	if err != nil {
		return nil, err
	}

	req.SetBasicAuth(string(basic.Username), string(basic.Password))

	resp, err := client.Do(req)

	if err != nil {
		return nil, err
	}

	// if the status code is 404, fallback to the Docker Hub implementation
	if resp.StatusCode == 404 {
		req, err := http.NewRequest(
			"GET",
			fmt.Sprintf("%s/", r.URL),
			nil,
		)

		if err != nil {
			return nil, err
		}

		req.SetBasicAuth(string(basic.Username), string(basic.Password))

		resp, err = client.Do(req)

		if err != nil {
			return nil, err
		}
	}

	gcrResp := gcrRepositoryResp{}

	if err := json.NewDecoder(resp.Body).Decode(&gcrResp); err != nil {
		return nil, fmt.Errorf("Could not read private registry repositories: %v", err)
	}

	res := make([]*Repository, 0)

	if err != nil {
		return nil, err
	}

	for _, repo := range gcrResp.Repositories {
		res = append(res, &Repository{
			Name: repo,
			URI:  parsedURL.Host + "/" + repo,
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

// CreateRepository creates a repository for a registry, if needed
// (currently only required for ECR)
func (r *Registry) CreateRepository(
	repo repository.Repository,
	name string,
) error {
	// if aws, create repository
	if r.AWSIntegrationID != 0 {
		return r.createECRRepository(repo, name)
	}

	// otherwise, no-op
	return nil
}

func (r *Registry) createECRRepository(
	repo repository.Repository,
	name string,
) error {
	aws, err := repo.AWSIntegration.ReadAWSIntegration(
		r.AWSIntegrationID,
	)

	if err != nil {
		return err
	}

	sess, err := aws.GetSession()

	if err != nil {
		return err
	}

	svc := ecr.New(sess)

	_, err = svc.CreateRepository(&ecr.CreateRepositoryInput{
		RepositoryName: &name,
	})

	return err
}

// ListImages lists the images for an image repository
func (r *Registry) ListImages(
	repoName string,
	repo repository.Repository,
	doAuth *oauth2.Config, // only required if using DOCR
) ([]*Image, error) {
	// switch on the auth mechanism to get a token
	if r.AWSIntegrationID != 0 {
		return r.listECRImages(repoName, repo)
	}

	if r.GCPIntegrationID != 0 {
		return r.listGCRImages(repoName, repo)
	}

	if r.DOIntegrationID != 0 {
		return r.listDOCRImages(repoName, repo, doAuth)
	}

	if r.BasicIntegrationID != 0 {
		return r.listPrivateRegistryImages(repoName, repo)
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

	parsedURL, err := url.Parse("https://" + r.URL)

	if err != nil {
		return nil, err
	}

	trimmedPath := strings.Trim(parsedURL.Path, "/")

	req, err := http.NewRequest(
		"GET",
		fmt.Sprintf("https://%s/v2/%s/%s/tags/list", parsedURL.Host, trimmedPath, repoName),
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

func (r *Registry) listDOCRImages(
	repoName string,
	repo repository.Repository,
	doAuth *oauth2.Config,
) ([]*Image, error) {
	oauthInt, err := repo.OAuthIntegration.ReadOAuthIntegration(
		r.DOIntegrationID,
	)

	if err != nil {
		return nil, err
	}

	tok, _, err := oauth.GetAccessToken(oauthInt, doAuth, repo)

	if err != nil {
		return nil, err
	}

	client := godo.NewFromToken(tok)

	urlArr := strings.Split(r.URL, "/")

	if len(urlArr) != 2 {
		return nil, fmt.Errorf("invalid digital ocean registry url")
	}

	name := urlArr[1]

	tags, _, err := client.Registry.ListRepositoryTags(context.TODO(), name, repoName, &godo.ListOptions{})

	if err != nil {
		return nil, err
	}

	res := make([]*Image, 0)

	for _, tag := range tags {
		res = append(res, &Image{
			RepositoryName: repoName,
			Tag:            tag.Tag,
		})
	}

	return res, nil
}

func (r *Registry) listPrivateRegistryImages(repoName string, repo repository.Repository) ([]*Image, error) {
	// handle dockerhub different, as it doesn't implement the docker registry http api
	if strings.Contains(r.URL, "docker.io") {
		return r.listDockerHubImages(repoName, repo)
	}

	basic, err := repo.BasicIntegration.ReadBasicIntegration(
		r.BasicIntegrationID,
	)

	if err != nil {
		return nil, err
	}

	// Just use service account key to authenticate, since scopes may not be in place
	// for oauth. This also prevents us from making more requests.
	client := &http.Client{}

	// get the host and scheme to make the request
	parsedURL, err := url.Parse(r.URL)

	req, err := http.NewRequest(
		"GET",
		fmt.Sprintf("%s://%s/v2/%s/tags/list", parsedURL.Scheme, parsedURL.Host, repoName),
		nil,
	)

	if err != nil {
		return nil, err
	}

	req.SetBasicAuth(string(basic.Username), string(basic.Password))

	resp, err := client.Do(req)

	if err != nil {
		return nil, err
	}

	gcrResp := gcrImageResp{}

	if err := json.NewDecoder(resp.Body).Decode(&gcrResp); err != nil {
		return nil, fmt.Errorf("Could not read private registry repositories: %v", err)
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

type dockerHubImageResult struct {
	Name string `json:"name"`
}

type dockerHubImageResp struct {
	Results []dockerHubImageResult `json:"results"`
}

func (r *Registry) listDockerHubImages(repoName string, repo repository.Repository) ([]*Image, error) {
	basic, err := repo.BasicIntegration.ReadBasicIntegration(
		r.BasicIntegrationID,
	)

	if err != nil {
		return nil, err
	}

	client := &http.Client{}

	req, err := http.NewRequest(
		"GET",
		fmt.Sprintf("https://hub.docker.com/v2/repositories/%s/tags", strings.Split(r.URL, "docker.io/")[1]),
		nil,
	)

	if err != nil {
		return nil, err
	}

	req.SetBasicAuth(string(basic.Username), string(basic.Password))

	resp, err := client.Do(req)

	if err != nil {
		return nil, err
	}

	imageResp := dockerHubImageResp{}

	if err := json.NewDecoder(resp.Body).Decode(&imageResp); err != nil {
		return nil, fmt.Errorf("Could not read private registry repositories: %v", err)
	}

	res := make([]*Image, 0)

	for _, result := range imageResp.Results {
		res = append(res, &Image{
			RepositoryName: repoName,
			Tag:            result.Name,
		})
	}

	return res, nil
}

// GetDockerConfigJSON returns a dockerconfigjson file contents with "auths"
// populated.
func (r *Registry) GetDockerConfigJSON(
	repo repository.Repository,
	doAuth *oauth2.Config, // only required if using DOCR
) ([]byte, error) {
	var conf *configfile.ConfigFile
	var err error

	// switch on the auth mechanism to get a token
	if r.AWSIntegrationID != 0 {
		conf, err = r.getECRDockerConfigFile(repo)
	}

	if r.GCPIntegrationID != 0 {
		conf, err = r.getGCRDockerConfigFile(repo)
	}

	if r.DOIntegrationID != 0 {
		conf, err = r.getDOCRDockerConfigFile(repo, doAuth)
	}

	if r.BasicIntegrationID != 0 {
		conf, err = r.getPrivateRegistryDockerConfigFile(repo)
	}

	if err != nil {
		return nil, err
	}

	return json.Marshal(conf)
}

func (r *Registry) getECRDockerConfigFile(
	repo repository.Repository,
) (*configfile.ConfigFile, error) {
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

	ecrSvc := ecr.New(sess)

	output, err := ecrSvc.GetAuthorizationToken(&ecr.GetAuthorizationTokenInput{})

	if err != nil {
		return nil, err
	}

	token := *output.AuthorizationData[0].AuthorizationToken

	decodedToken, err := base64.StdEncoding.DecodeString(token)

	if err != nil {
		return nil, err
	}

	parts := strings.SplitN(string(decodedToken), ":", 2)

	if len(parts) < 2 {
		return nil, err
	}

	key := r.URL

	if !strings.Contains(key, "http") {
		key = "https://" + key
	}

	return &configfile.ConfigFile{
		AuthConfigs: map[string]types.AuthConfig{
			key: types.AuthConfig{
				Username: parts[0],
				Password: parts[1],
				Auth:     token,
			},
		},
	}, nil
}

func (r *Registry) getGCRDockerConfigFile(
	repo repository.Repository,
) (*configfile.ConfigFile, error) {
	gcp, err := repo.GCPIntegration.ReadGCPIntegration(
		r.GCPIntegrationID,
	)

	if err != nil {
		return nil, err
	}

	key := r.URL

	if !strings.Contains(key, "http") {
		key = "https://" + key
	}

	parsedURL, _ := url.Parse(key)

	return &configfile.ConfigFile{
		AuthConfigs: map[string]types.AuthConfig{
			parsedURL.Host: types.AuthConfig{
				Username: "_json_key",
				Password: string(gcp.GCPKeyData),
				Auth:     generateAuthToken("_json_key", string(gcp.GCPKeyData)),
			},
		},
	}, nil
}

func (r *Registry) getDOCRDockerConfigFile(
	repo repository.Repository,
	doAuth *oauth2.Config,
) (*configfile.ConfigFile, error) {
	oauthInt, err := repo.OAuthIntegration.ReadOAuthIntegration(
		r.DOIntegrationID,
	)

	if err != nil {
		return nil, err
	}

	tok, _, err := oauth.GetAccessToken(oauthInt, doAuth, repo)

	if err != nil {
		return nil, err
	}

	key := r.URL

	if !strings.Contains(key, "http") {
		key = "https://" + key
	}

	parsedURL, _ := url.Parse(key)

	return &configfile.ConfigFile{
		AuthConfigs: map[string]types.AuthConfig{
			parsedURL.Host: types.AuthConfig{
				Username: tok,
				Password: tok,
				Auth:     generateAuthToken(tok, tok),
			},
		},
	}, nil
}

func (r *Registry) getPrivateRegistryDockerConfigFile(
	repo repository.Repository,
) (*configfile.ConfigFile, error) {
	basic, err := repo.BasicIntegration.ReadBasicIntegration(
		r.BasicIntegrationID,
	)

	if err != nil {
		return nil, err
	}

	key := r.URL

	if !strings.Contains(key, "http") {
		key = "https://" + key
	}

	parsedURL, _ := url.Parse(key)

	authConfigKey := parsedURL.Host

	if strings.Contains(r.URL, "index.docker.io") {
		authConfigKey = "https://index.docker.io/v1/"
	}

	return &configfile.ConfigFile{
		AuthConfigs: map[string]types.AuthConfig{
			authConfigKey: types.AuthConfig{
				Username: string(basic.Username),
				Password: string(basic.Password),
				Auth:     generateAuthToken(string(basic.Username), string(basic.Password)),
			},
		},
	}, nil
}

func generateAuthToken(username, password string) string {
	return base64.StdEncoding.EncodeToString([]byte(username + ":" + password))
}
