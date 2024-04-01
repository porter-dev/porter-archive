package registry

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"math/rand"
	"net/http"
	"net/url"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/porter-dev/porter/internal/telemetry"

	artifactregistry "cloud.google.com/go/artifactregistry/apiv1beta2"
	"connectrpc.com/connect"
	"github.com/Azure/azure-sdk-for-go/sdk/azidentity"
	"github.com/aws/aws-sdk-go/aws/awserr"
	"github.com/aws/aws-sdk-go/service/ecr"
	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/oauth"
	"github.com/porter-dev/porter/internal/repository"
	"golang.org/x/oauth2"
	v1artifactregistry "google.golang.org/api/artifactregistry/v1"
	"google.golang.org/api/iterator"
	"google.golang.org/api/option"
	artifactregistrypb "google.golang.org/genproto/googleapis/devtools/artifactregistry/v1beta2"

	ints "github.com/porter-dev/porter/internal/models/integrations"

	ptypes "github.com/porter-dev/porter/api/types"

	"github.com/digitalocean/godo"
	"github.com/docker/cli/cli/config/configfile"
	"github.com/docker/cli/cli/config/types"
	"github.com/docker/distribution/reference"

	"github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/containerregistry/armcontainerregistry"

	"github.com/Azure/azure-sdk-for-go/sdk/azcore/to"
)

// Registry wraps the gorm Registry model
type Registry models.Registry

func GetECRRegistryURL(awsIntRepo repository.AWSIntegrationRepository, projectID, awsIntID uint) (string, error) {
	awsInt, err := awsIntRepo.ReadAWSIntegration(projectID, awsIntID)
	if err != nil {
		return "", err
	}

	sess, err := awsInt.GetSession()
	if err != nil {
		return "", err
	}

	ecrSvc := ecr.New(sess)

	output, err := ecrSvc.GetAuthorizationToken(&ecr.GetAuthorizationTokenInput{})
	if err != nil {
		return "", err
	}

	return *output.AuthorizationData[0].ProxyEndpoint, nil
}

// ListRepositories lists the repositories for a registry
func (r *Registry) ListRepositories(
	ctx context.Context,
	repo repository.Repository,
	conf *config.Config,
) ([]*ptypes.RegistryRepository, error) {
	ctx, span := telemetry.NewSpan(ctx, "list-repositories")
	defer span.End()

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "registry-name", Value: r.Name},
		telemetry.AttributeKV{Key: "registry-id", Value: r.ID},
		telemetry.AttributeKV{Key: "project-id", Value: r.ProjectID},
	)

	// switch on the auth mechanism to get a token
	if r.AWSIntegrationID != 0 {
		telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "auth-mechanism", Value: "aws"})
		aws, err := repo.AWSIntegration().ReadAWSIntegration(
			r.ProjectID,
			r.AWSIntegrationID,
		)
		if err != nil {
			return nil, telemetry.Error(ctx, span, err, "error reading aws integration")
		}

		repos, err := r.listECRRepositories(aws)
		if err != nil {
			return nil, telemetry.Error(ctx, span, err, "error listing ecr repositories")
		}

		return repos, nil
	}

	if r.GCPIntegrationID != 0 {
		telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "auth-mechanism", Value: "gcp"})
		if strings.Contains(r.URL, "pkg.dev") {
			return r.listGARRepositories(ctx, repo)
		}

		repos, err := r.listGCRRepositories(repo)
		if err != nil {
			return nil, telemetry.Error(ctx, span, err, "error listing gcr repositories")
		}

		return repos, nil
	}

	if r.DOIntegrationID != 0 {
		telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "auth-mechanism", Value: "do"})

		repos, err := r.listDOCRRepositories(repo, conf.DOConf)
		if err != nil {
			return nil, telemetry.Error(ctx, span, err, "error listing docr repositories")
		}

		return repos, nil
	}

	if r.AzureIntegrationID != 0 {
		telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "auth-mechanism", Value: "azure"})

		repos, err := r.listACRRepositories(ctx, repo)
		if err != nil {
			return nil, telemetry.Error(ctx, span, err, "error listing acr repositories")
		}

		return repos, nil
	}

	if r.BasicIntegrationID != 0 {
		telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "auth-mechanism", Value: "basic"})

		repos, err := r.listPrivateRegistryRepositories(repo)
		if err != nil {
			return nil, telemetry.Error(ctx, span, err, "error listing private repositories")
		}

		return repos, nil
	}

	project, err := conf.Repo.Project().ReadProject(r.ProjectID)
	if err != nil {
		return nil, telemetry.Error(ctx, span, err, "error getting project for repository")
	}

	if project.GetFeatureFlag(models.CapiProvisionerEnabled, conf.LaunchDarklyClient) {
		// TODO: Remove this conditional when AWS list repos is supported in CCP
		telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "registry-uri", Value: r.URL})

		if strings.Contains(r.URL, ".azurecr.") || strings.Contains(r.URL, "-docker.pkg.dev") {
			req := connect.NewRequest(&porterv1.ListRepositoriesForRegistryRequest{
				ProjectId:   int64(r.ProjectID),
				RegistryUri: r.URL,
			})

			resp, err := conf.ClusterControlPlaneClient.ListRepositoriesForRegistry(ctx, req)
			if err != nil {
				return nil, telemetry.Error(ctx, span, err, "error listing docker repositories")
			}

			res := make([]*ptypes.RegistryRepository, 0)

			parsedURL, err := url.Parse("https://" + r.URL)
			if err != nil {
				return nil, telemetry.Error(ctx, span, err, "error parsing url")
			}

			for _, repo := range resp.Msg.Repositories {
				res = append(res, &ptypes.RegistryRepository{
					Name: repo.Name,
					URI:  parsedURL.Host + "/" + repo.Name,
				})
			}

			return res, nil
		} else {
			uri := strings.TrimPrefix(r.URL, "https://")
			splits := strings.Split(uri, ".")
			if len(splits) < 4 {
				return nil, telemetry.Error(ctx, span, nil, "uri does not have enough splits")
			}
			accountID := splits[0]
			region := splits[3]
			req := connect.NewRequest(&porterv1.AssumeRoleCredentialsRequest{
				ProjectId:    int64(r.ProjectID),
				AwsAccountId: accountID,
			})
			creds, err := conf.ClusterControlPlaneClient.AssumeRoleCredentials(ctx, req)
			if err != nil {
				return nil, telemetry.Error(ctx, span, err, "error getting capi credentials for registry")
			}
			aws := &ints.AWSIntegration{
				AWSAccessKeyID:     []byte(creds.Msg.AwsAccessId),
				AWSSecretAccessKey: []byte(creds.Msg.AwsSecretKey),
				AWSSessionToken:    []byte(creds.Msg.AwsSessionToken),
				AWSRegion:          region,
			}

			repos, err := r.listECRRepositories(aws)
			if err != nil {
				return nil, telemetry.Error(ctx, span, err, "error listing ecr repositories")
			}

			return repos, nil
		}
	}

	return nil, telemetry.Error(ctx, span, nil, "error listing repositories")
}

type gcrJWT struct {
	AccessToken  string `json:"token"`
	ExpiresInSec int    `json:"expires_in"`
}

type gcrErr struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

type gcrRepositoryResp struct {
	Repositories []string `json:"repositories"`
	Errors       []gcrErr `json:"errors"`
}

func (r *Registry) GetGCRToken(ctx context.Context, repo repository.Repository) (*oauth2.Token, error) {
	getTokenCache := r.getTokenCacheFunc(ctx, repo)

	gcp, err := repo.GCPIntegration().ReadGCPIntegration(
		r.ProjectID,
		r.GCPIntegrationID,
	)
	if err != nil {
		return nil, err
	}

	// get oauth2 access token
	return gcp.GetBearerToken(
		ctx,
		getTokenCache,
		r.setTokenCacheFunc(ctx, repo),
		"https://www.googleapis.com/auth/devstorage.read_write",
	)
}

func (r *Registry) listGCRRepositories(
	repo repository.Repository,
) ([]*ptypes.RegistryRepository, error) {
	gcp, err := repo.GCPIntegration().ReadGCPIntegration(
		r.ProjectID,
		r.GCPIntegrationID,
	)
	if err != nil {
		return nil, err
	}

	// Just use service account key to authenticate, since scopes may not be in place
	// for oauth. This also prevents us from making more requests.
	client := &http.Client{}

	regURL := r.URL

	if !strings.HasPrefix(regURL, "http") {
		regURL = fmt.Sprintf("https://%s", regURL)
	}

	regURLParsed, err := url.Parse(regURL)
	regHostname := "gcr.io"

	if err == nil {
		regHostname = regURLParsed.Host
	}

	req, err := http.NewRequest(
		"GET",
		fmt.Sprintf("https://%s/v2/_catalog", regHostname),
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

	if len(gcrResp.Errors) > 0 {
		errMsg := ""
		for _, gcrErr := range gcrResp.Errors {
			errMsg += fmt.Sprintf(": Code %s, message %s", gcrErr.Code, gcrErr.Message)
		}

		return nil, fmt.Errorf(errMsg)
	}

	res := make([]*ptypes.RegistryRepository, 0)

	parsedURL, err := url.Parse("https://" + r.URL)
	if err != nil {
		return nil, err
	}

	for _, repo := range gcrResp.Repositories {
		res = append(res, &ptypes.RegistryRepository{
			Name: repo,
			URI:  parsedURL.Host + "/" + repo,
		})
	}

	return res, nil
}

func (r *Registry) GetGARToken(ctx context.Context, repo repository.Repository) (*oauth2.Token, error) {
	getTokenCache := r.getTokenCacheFunc(ctx, repo)

	gcp, err := repo.GCPIntegration().ReadGCPIntegration(
		r.ProjectID,
		r.GCPIntegrationID,
	)
	if err != nil {
		return nil, err
	}

	// get oauth2 access token
	return gcp.GetBearerToken(
		ctx,
		getTokenCache,
		r.setTokenCacheFunc(ctx, repo),
		"https://www.googleapis.com/auth/cloud-platform",
	)
}

type garTokenSource struct {
	// ctx is only passed in here as the oauth2.Token() doesnt support contexts
	ctx  context.Context
	reg  *Registry
	repo repository.Repository
}

func (source *garTokenSource) Token() (*oauth2.Token, error) {
	return source.reg.GetGARToken(source.ctx, source.repo)
}

// GAR has the concept of a "repository" which is a collection of images, unlike ECR or others
// where a repository is a single image. This function returns the list of fully qualified names
// of GAR images including their repository names.
func (r *Registry) listGARRepositories(
	ctx context.Context,
	repo repository.Repository,
) ([]*ptypes.RegistryRepository, error) {
	gcpInt, err := repo.GCPIntegration().ReadGCPIntegration(
		r.ProjectID,
		r.GCPIntegrationID,
	)
	if err != nil {
		return nil, err
	}

	client, err := artifactregistry.NewClient(ctx, option.WithTokenSource(&garTokenSource{
		reg:  r,
		repo: repo,
		ctx:  ctx,
	}), option.WithScopes("roles/artifactregistry.reader"))
	if err != nil {
		return nil, err
	}

	var repoNames []string
	nextToken := ""

	parsedURL, err := url.Parse("https://" + r.URL)
	if err != nil {
		return nil, err
	}

	location := strings.TrimSuffix(parsedURL.Host, "-docker.pkg.dev")

	for {
		it := client.ListRepositories(context.Background(), &artifactregistrypb.ListRepositoriesRequest{
			Parent:    fmt.Sprintf("projects/%s/locations/%s", gcpInt.GCPProjectID, location),
			PageSize:  1000,
			PageToken: nextToken,
		})

		for {
			resp, err := it.Next()

			if err == iterator.Done {
				break
			} else if err != nil {
				return nil, err
			}

			if resp.GetFormat() == artifactregistrypb.Repository_DOCKER { // we only care about
				repoSlice := strings.Split(resp.GetName(), "/")
				repoName := repoSlice[len(repoSlice)-1]

				repoNames = append(repoNames, repoName)
			}
		}

		if it.PageInfo().Token == "" {
			break
		}

		nextToken = it.PageInfo().Token
	}

	svc, err := v1artifactregistry.NewService(ctx, option.WithTokenSource(&garTokenSource{
		reg:  r,
		repo: repo,
		ctx:  ctx,
	}), option.WithScopes("roles/artifactregistry.reader"))
	if err != nil {
		return nil, err
	}

	nextToken = ""

	dockerSvc := v1artifactregistry.NewProjectsLocationsRepositoriesDockerImagesService(svc)

	var (
		wg     sync.WaitGroup
		resMap sync.Map
	)

	for _, repoName := range repoNames {
		wg.Add(1)

		go func(repoName string) {
			defer wg.Done()

			for {
				resp, err := dockerSvc.List(fmt.Sprintf("projects/%s/locations/%s/repositories/%s",
					gcpInt.GCPProjectID, location, repoName)).PageSize(1000).PageToken(nextToken).Do()
				if err != nil {
					// FIXME: we should report this error using a channel
					return
				}

				for _, image := range resp.DockerImages {
					named, err := reference.ParseNamed(image.Uri)
					if err != nil {
						// let us skip this image becaue it has a malformed URI coming from the GCP API
						continue
					}

					uploadTime, _ := time.Parse(time.RFC3339, image.UploadTime)

					resMap.Store(named.Name(), &ptypes.RegistryRepository{
						Name:      repoName,
						URI:       named.Name(),
						CreatedAt: uploadTime,
					})
				}

				if resp.NextPageToken == "" {
					break
				}

				nextToken = resp.NextPageToken
			}
		}(repoName)
	}

	wg.Wait()

	var res []*ptypes.RegistryRepository

	resMap.Range(func(_, value any) bool {
		res = append(res, value.(*ptypes.RegistryRepository))
		return true
	})

	return res, nil
}

func (r *Registry) listECRRepositories(aws *ints.AWSIntegration) ([]*ptypes.RegistryRepository, error) {
	sess, err := aws.GetSession()
	if err != nil {
		return nil, err
	}

	svc := ecr.New(sess)

	res := make([]*ptypes.RegistryRepository, 0)
	input := &ecr.DescribeRepositoriesInput{}

	for {
		resp, err := svc.DescribeRepositories(input)
		if err != nil {
			return nil, err
		}

		for _, repo := range resp.Repositories {
			res = append(res, &ptypes.RegistryRepository{
				Name:      *repo.RepositoryName,
				CreatedAt: *repo.CreatedAt,
				URI:       *repo.RepositoryUri,
			})
		}

		if resp.NextToken == nil {
			break
		}

		input.NextToken = resp.NextToken
	}

	return res, nil
}

type acrRepositoryResp struct {
	Repositories []string `json:"repositories"`
}

func (r *Registry) listACRRepositories(ctx context.Context, repo repository.Repository) ([]*ptypes.RegistryRepository, error) {
	ctx, span := telemetry.NewSpan(ctx, "list-acr-repositories")
	defer span.End()

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "registry-name", Value: r.Name},
		telemetry.AttributeKV{Key: "registry-id", Value: r.ID},
		telemetry.AttributeKV{Key: "project-id", Value: r.ProjectID},
	)

	az, err := repo.AzureIntegration().ReadAzureIntegration(
		r.ProjectID,
		r.AzureIntegrationID,
	)
	if err != nil {
		return nil, telemetry.Error(ctx, span, err, "error reading azure integration")
	}

	client := &http.Client{}

	acrURL := r.URL
	if !strings.Contains(acrURL, "http") {
		acrURL = fmt.Sprintf("https://%s", acrURL)
	}

	req, err := http.NewRequest(
		"GET",
		fmt.Sprintf("%s/v2/_catalog", acrURL),
		nil,
	)
	if err != nil {
		return nil, telemetry.Error(ctx, span, err, "error getting http request")
	}

	req.SetBasicAuth(az.AzureClientID, string(az.ServicePrincipalSecret))

	resp, err := client.Do(req)
	if err != nil {
		return nil, telemetry.Error(ctx, span, err, "error making http call")
	}

	acrResp := acrRepositoryResp{}

	if err := json.NewDecoder(resp.Body).Decode(&acrResp); err != nil {
		return nil, telemetry.Error(ctx, span, err, "could not read Azure registry repository response")
	}

	res := make([]*ptypes.RegistryRepository, 0)

	for _, repo := range acrResp.Repositories {
		res = append(res, &ptypes.RegistryRepository{
			Name: repo,
			URI:  strings.TrimPrefix(r.URL, "https://") + "/" + repo,
		})
	}

	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "repo-count", Value: len(acrResp.Repositories)})

	return res, nil
}

// Returns the username/password pair for the registry
func (r *Registry) GetACRCredentials(repo repository.Repository) (string, string, error) {
	az, err := repo.AzureIntegration().ReadAzureIntegration(
		r.ProjectID,
		r.AzureIntegrationID,
	)
	if err != nil {
		return "", "", err
	}

	// if the passwords and name aren't set, generate them
	// unique token name to prevent token expiry during close subsequent builds.
	// Token expires in 14 days, limited at 100 tokens/reg.
	if az.ACRTokenName == "" || len(az.ACRPassword1) == 0 {
		az.ACRTokenName = fmt.Sprintf("porter-acr-token-%s-%d", az.ACRName, rand.Intn(100)) // nolint:gosec

		// create an acr repo token
		cred, err := azidentity.NewClientSecretCredential(az.AzureTenantID, az.AzureClientID, string(az.ServicePrincipalSecret), nil)
		if err != nil {
			return "", "", err
		}

		scopeMapsClient, err := armcontainerregistry.NewScopeMapsClient(az.AzureSubscriptionID, cred, nil)
		if err != nil {
			return "", "", err
		}

		smRes, err := scopeMapsClient.Get(
			context.Background(),
			az.ACRResourceGroupName,
			az.ACRName,
			"_repositories_admin",
			nil,
		)
		if err != nil {
			return "", "", err
		}

		tokensClient, err := armcontainerregistry.NewTokensClient(az.AzureSubscriptionID, cred, nil)
		if err != nil {
			return "", "", err
		}

		pollerResp, err := tokensClient.BeginCreate(
			context.Background(),
			az.ACRResourceGroupName,
			az.ACRName,
			az.ACRTokenName,
			armcontainerregistry.Token{
				Properties: &armcontainerregistry.TokenProperties{
					ScopeMapID: smRes.ID,
					Status:     to.Ptr(armcontainerregistry.TokenStatusEnabled),
				},
			},
			nil,
		)
		if err != nil {
			return "", "", err
		}

		tokResp, err := pollerResp.PollUntilDone(context.Background(), 2*time.Second)
		if err != nil {
			return "", "", err
		}

		registriesClient, err := armcontainerregistry.NewRegistriesClient(az.AzureSubscriptionID, cred, nil)
		if err != nil {
			return "", "", err
		}

		poller, err := registriesClient.BeginGenerateCredentials(
			context.Background(),
			az.ACRResourceGroupName,
			az.ACRName,
			armcontainerregistry.GenerateCredentialsParameters{
				TokenID: tokResp.ID,
			},
			&armcontainerregistry.RegistriesClientBeginGenerateCredentialsOptions{ResumeToken: ""})
		if err != nil {
			return "", "", err
		}

		genCredentialsResp, err := poller.PollUntilDone(context.Background(), 2*time.Second)
		if err != nil {
			return "", "", err
		}

		for i, tokPassword := range genCredentialsResp.Passwords {
			if i == 0 {
				az.ACRPassword1 = []byte(*tokPassword.Value)
			} else if i == 1 {
				az.ACRPassword2 = []byte(*tokPassword.Value)
			}
		}

		// update the az integration
		az, err = repo.AzureIntegration().OverwriteAzureIntegration(
			az,
		)

		if err != nil {
			return "", "", err
		}
	}

	return az.ACRTokenName, string(az.ACRPassword1), nil
}

func (r *Registry) listDOCRRepositories(
	repo repository.Repository,
	doAuth *oauth2.Config,
) ([]*ptypes.RegistryRepository, error) {
	oauthInt, err := repo.OAuthIntegration().ReadOAuthIntegration(
		r.ProjectID,
		r.DOIntegrationID,
	)
	if err != nil {
		return nil, err
	}

	tok, _, err := oauth.GetAccessToken(oauthInt.SharedOAuthModel, doAuth, oauth.MakeUpdateOAuthIntegrationTokenFunction(oauthInt, repo))
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

	res := make([]*ptypes.RegistryRepository, 0)

	for _, repo := range repos {
		res = append(res, &ptypes.RegistryRepository{
			Name: repo.Name,
			URI:  r.URL + "/" + repo.Name,
		})
	}

	return res, nil
}

func (r *Registry) listPrivateRegistryRepositories(
	repo repository.Repository,
) ([]*ptypes.RegistryRepository, error) {
	// handle dockerhub different, as it doesn't implement the docker registry http api
	if strings.Contains(r.URL, "docker.io") {
		// in this case, we just return the single dockerhub repository that's linked
		res := make([]*ptypes.RegistryRepository, 0)

		res = append(res, &ptypes.RegistryRepository{
			Name: strings.Split(r.URL, "docker.io/")[1],
			URI:  r.URL,
		})

		return res, nil
	}

	basic, err := repo.BasicIntegration().ReadBasicIntegration(
		r.ProjectID,
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

	res := make([]*ptypes.RegistryRepository, 0)

	if err != nil {
		return nil, err
	}

	for _, repo := range gcrResp.Repositories {
		res = append(res, &ptypes.RegistryRepository{
			Name: repo,
			URI:  parsedURL.Host + "/" + repo,
		})
	}

	return res, nil
}

func (r *Registry) getTokenCacheFunc(
	ctx context.Context,
	repo repository.Repository,
) ints.GetTokenCacheFunc {
	return func(ctx context.Context) (tok *ints.TokenCache, err error) {
		reg, err := repo.Registry().ReadRegistry(r.ProjectID, r.ID)
		if err != nil {
			return nil, err
		}

		return &reg.TokenCache.TokenCache, nil
	}
}

func (r *Registry) setTokenCacheFunc(
	ctx context.Context,
	repo repository.Repository,
) ints.SetTokenCacheFunc {
	return func(ctx context.Context, token string, expiry time.Time) error {
		_, err := repo.Registry().UpdateRegistryTokenCache(
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
	ctx context.Context,
	conf *config.Config,
	name string,
) error {
	ctx, span := telemetry.NewSpan(ctx, "create-repository")
	defer span.End()

	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "registry-uri", Value: r.URL})

	// if aws, create repository
	if r.AWSIntegrationID != 0 {
		telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "aws-integration-id", Value: r.AWSIntegrationID})
		aws, err := conf.Repo.AWSIntegration().ReadAWSIntegration(
			r.ProjectID,
			r.AWSIntegrationID,
		)
		if err != nil {
			return telemetry.Error(ctx, span, err, "error reading aws integration")
		}
		err = r.createECRRepository(aws, name)
		if err != nil {
			return telemetry.Error(ctx, span, err, "error creating ecr repository")
		}
		return nil
	} else if r.GCPIntegrationID != 0 && strings.Contains(r.URL, "pkg.dev") {
		telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "gcp-integration-id", Value: r.GCPIntegrationID})
		err := r.createGARRepository(ctx, conf.Repo, name)
		if err != nil {
			return telemetry.Error(ctx, span, err, "error creating gar repository")
		}
		return nil
	}

	project, err := conf.Repo.Project().ReadProject(r.ProjectID)
	if err != nil {
		return telemetry.Error(ctx, span, err, "error getting project for repository")
	}

	if project.GetFeatureFlag(models.CapiProvisionerEnabled, conf.LaunchDarklyClient) {
		// no need to create repository if pushing to ACR or GAR
		if strings.Contains(r.URL, ".azurecr.") || strings.Contains(r.URL, "-docker.pkg.dev") {
			telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "skipping-create-repo", Value: true})
			return nil
		}

		uri := strings.TrimPrefix(r.URL, "https://")
		splits := strings.Split(uri, ".")
		accountID := splits[0]
		region := splits[3]
		req := connect.NewRequest(&porterv1.AssumeRoleCredentialsRequest{
			ProjectId:    int64(r.ProjectID),
			AwsAccountId: accountID,
		})
		telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "uri", Value: uri})
		creds, err := conf.ClusterControlPlaneClient.AssumeRoleCredentials(ctx, req)
		if err != nil {
			return telemetry.Error(ctx, span, err, "error getting capi credentials for repository")
		}
		aws := &ints.AWSIntegration{
			AWSAccessKeyID:     []byte(creds.Msg.AwsAccessId),
			AWSSecretAccessKey: []byte(creds.Msg.AwsSecretKey),
			AWSSessionToken:    []byte(creds.Msg.AwsSessionToken),
			AWSRegion:          region,
		}
		err = r.createECRRepository(aws, name)
		if err != nil {
			return telemetry.Error(ctx, span, err, "error creating ecr repository")
		}
	}

	// otherwise, no-op
	return nil
}

func (r *Registry) createECRRepository(
	aws *ints.AWSIntegration,
	name string,
) error {
	sess, err := aws.GetSession()
	if err != nil {
		return err
	}

	svc := ecr.New(sess)

	// determine if repository already exists
	_, err = svc.DescribeRepositories(&ecr.DescribeRepositoriesInput{
		RepositoryNames: []*string{&name},
	})

	// if the repository was not found, create it
	if aerr, ok := err.(awserr.Error); ok && aerr.Code() == ecr.ErrCodeRepositoryNotFoundException {
		_, err = svc.CreateRepository(&ecr.CreateRepositoryInput{
			RepositoryName: &name,
		})

		return err
	} else if err != nil {
		return err
	}

	return nil
}

func (r *Registry) createGARRepository(
	ctx context.Context,
	repo repository.Repository,
	name string,
) error {
	gcpInt, err := repo.GCPIntegration().ReadGCPIntegration(
		r.ProjectID,
		r.GCPIntegrationID,
	)
	if err != nil {
		return err
	}

	client, err := artifactregistry.NewClient(ctx, option.WithTokenSource(&garTokenSource{
		reg:  r,
		repo: repo,
		ctx:  ctx,
	}), option.WithScopes("roles/artifactregistry.admin"))
	if err != nil {
		return err
	}

	defer client.Close()

	parsedURL, err := url.Parse("https://" + r.URL)
	if err != nil {
		return err
	}

	location := strings.TrimSuffix(parsedURL.Host, "-docker.pkg.dev")

	_, err = client.GetRepository(context.Background(), &artifactregistrypb.GetRepositoryRequest{
		Name: fmt.Sprintf("projects/%s/locations/%s/repositories/%s", gcpInt.GCPProjectID, location, name),
	})

	if err != nil && strings.Contains(err.Error(), "not found") {
		// create a new repository
		_, err := client.CreateRepository(context.Background(), &artifactregistrypb.CreateRepositoryRequest{
			Parent:       fmt.Sprintf("projects/%s/locations/%s", gcpInt.GCPProjectID, location),
			RepositoryId: name,
			Repository: &artifactregistrypb.Repository{
				Format: artifactregistrypb.Repository_DOCKER,
			},
		})
		if err != nil {
			return err
		}
	} else if err != nil {
		return err
	}

	return nil
}

// ListImages lists the images for an image repository
func (r *Registry) ListImages(
	ctx context.Context,
	repoName string,
	repo repository.Repository,
	conf *config.Config,
) ([]*ptypes.Image, error) {
	ctx, span := telemetry.NewSpan(ctx, "list-repositories")
	defer span.End()

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "registry-name", Value: r.Name},
		telemetry.AttributeKV{Key: "registry-id", Value: r.ID},
		telemetry.AttributeKV{Key: "registry-url", Value: r.URL},
		telemetry.AttributeKV{Key: "project-id", Value: r.ProjectID},
		telemetry.AttributeKV{Key: "repo-name", Value: repoName},
	)

	// switch on the auth mechanism to get a token
	if r.AWSIntegrationID != 0 {
		aws, err := repo.AWSIntegration().ReadAWSIntegration(
			r.ProjectID,
			r.AWSIntegrationID,
		)
		if err != nil {
			return nil, err
		}
		return r.listECRImages(aws, repoName, repo)
	}

	if r.AzureIntegrationID != 0 {
		return r.listACRImages(repoName, repo)
	}

	if r.GCPIntegrationID != 0 {
		if strings.Contains(r.URL, "pkg.dev") {
			return r.listGARImages(ctx, repoName, repo)
		}

		return r.listGCRImages(repoName, repo)
	}

	if r.DOIntegrationID != 0 {
		return r.listDOCRImages(repoName, repo, conf.DOConf)
	}

	if r.BasicIntegrationID != 0 {
		return r.listPrivateRegistryImages(repoName, repo)
	}

	project, err := conf.Repo.Project().ReadProject(r.ProjectID)
	if err != nil {
		return nil, fmt.Errorf("error getting project for repository: %w", err)
	}

	if project.GetFeatureFlag(models.CapiProvisionerEnabled, conf.LaunchDarklyClient) {

		if strings.Contains(r.URL, ".azurecr.") || strings.Contains(r.URL, "-docker.pkg.dev") {
			req := connect.NewRequest(&porterv1.ListImagesForRepositoryRequest{
				ProjectId:   int64(r.ProjectID),
				RegistryUri: r.URL,
				RepoName:    repoName,
			})

			resp, err := conf.ClusterControlPlaneClient.ListImagesForRepository(ctx, req)
			if err != nil {
				return nil, telemetry.Error(ctx, span, err, "error calling ccp list images")
			}

			res := make([]*ptypes.Image, 0)

			for _, image := range resp.Msg.Images {
				if image.UpdatedAt == nil {
					continue
				}
				lastUpdateTime := image.UpdatedAt.AsTime()

				res = append(res, &ptypes.Image{
					Digest:         image.Digest,
					Tag:            image.Tag,
					Manifest:       "",
					RepositoryName: image.RepositoryName,
					PushedAt:       &lastUpdateTime,
				})
			}

			return res, nil
		}

		uri := strings.TrimPrefix(r.URL, "https://")
		splits := strings.Split(uri, ".")
		accountID := splits[0]
		region := splits[3]
		req := connect.NewRequest(&porterv1.AssumeRoleCredentialsRequest{
			ProjectId:    int64(r.ProjectID),
			AwsAccountId: accountID,
		})
		creds, err := conf.ClusterControlPlaneClient.AssumeRoleCredentials(ctx, req)
		if err != nil {
			return nil, fmt.Errorf("error getting capi credentials for repository: %w", err)
		}
		aws := &ints.AWSIntegration{
			AWSAccessKeyID:     []byte(creds.Msg.AwsAccessId),
			AWSSecretAccessKey: []byte(creds.Msg.AwsSecretKey),
			AWSSessionToken:    []byte(creds.Msg.AwsSessionToken),
			AWSRegion:          region,
		}
		return r.listECRImages(aws, repoName, repo)
	}

	return nil, fmt.Errorf("error listing images")
}

func (r *Registry) GetECRPaginatedImages(
	repoName string,
	maxResults int64,
	nextToken *string,
	aws *ints.AWSIntegration,
) ([]*ptypes.Image, *string, error) {
	if aws == nil {
		return nil, nil, errors.New("aws integration is nil")
	}

	sess, err := aws.GetSession()
	if err != nil {
		return nil, nil, err
	}

	svc := ecr.New(sess)

	resp, err := svc.ListImages(&ecr.ListImagesInput{
		RepositoryName: &repoName,
		MaxResults:     &maxResults,
		NextToken:      nextToken,
	})
	if err != nil {
		return nil, nil, err
	}

	if len(resp.ImageIds) == 0 {
		return []*ptypes.Image{}, nil, nil
	}

	imageIDLen := len(resp.ImageIds)
	imageDetails := make([]*ecr.ImageDetail, 0)
	imageIDMap := make(map[string]bool)

	for _, id := range resp.ImageIds {
		if id != nil && id.ImageTag != nil {
			imageIDMap[*id.ImageTag] = true
		}
	}

	var wg sync.WaitGroup
	var mu sync.Mutex

	// AWS API expects the length of imageIDs to be at max 100 at a time
	for start := 0; start < imageIDLen; start += 100 {
		end := start + 100
		if end > imageIDLen {
			end = imageIDLen
		}

		wg.Add(1)

		go func(start, end int) {
			defer wg.Done()

			describeResp, err := svc.DescribeImages(&ecr.DescribeImagesInput{
				RepositoryName: &repoName,
				ImageIds:       resp.ImageIds[start:end],
			})
			if err != nil {
				return
			}

			mu.Lock()
			imageDetails = append(imageDetails, describeResp.ImageDetails...)
			mu.Unlock()
		}(start, end)
	}

	wg.Wait()

	res := make([]*ptypes.Image, 0)
	imageInfoMap := make(map[string]*ptypes.Image)

	for _, img := range imageDetails {
		for _, tag := range img.ImageTags {
			newImage := &ptypes.Image{
				Digest:         *img.ImageDigest,
				Tag:            *tag,
				RepositoryName: repoName,
				PushedAt:       img.ImagePushedAt,
			}

			if _, ok := imageIDMap[*tag]; ok {
				if _, ok := imageInfoMap[*tag]; !ok {
					imageInfoMap[*tag] = newImage
				}
			}

			if len(imageInfoMap) == int(maxResults) {
				break
			}
		}

		if len(imageInfoMap) == int(maxResults) {
			break
		}
	}

	for _, v := range imageInfoMap {
		res = append(res, v)
	}

	sort.Slice(res, func(i, j int) bool {
		if res[i].PushedAt == nil || res[j].PushedAt == nil {
			return false
		}

		return res[i].PushedAt.After(*res[j].PushedAt)
	})

	return res, resp.NextToken, nil
}

func (r *Registry) listECRImages(aws *ints.AWSIntegration, repoName string, repo repository.Repository) ([]*ptypes.Image, error) {
	sess, err := aws.GetSession()
	if err != nil {
		return nil, err
	}

	svc := ecr.New(sess)

	maxResults := int64(1000)

	var imageIDs []*ecr.ImageIdentifier

	resp, err := svc.ListImages(&ecr.ListImagesInput{
		RepositoryName: &repoName,
		MaxResults:     &maxResults,
	})
	if err != nil {
		return nil, err
	}

	if len(resp.ImageIds) == 0 {
		return []*ptypes.Image{}, nil
	}

	imageIDs = append(imageIDs, resp.ImageIds...)

	nextToken := resp.NextToken

	for nextToken != nil {
		resp, err := svc.ListImages(&ecr.ListImagesInput{
			RepositoryName: &repoName,
			MaxResults:     &maxResults,
			NextToken:      nextToken,
		})
		if err != nil {
			return nil, err
		}

		imageIDs = append(imageIDs, resp.ImageIds...)
		nextToken = resp.NextToken
	}

	imageIDLen := len(imageIDs)
	imageDetails := make([]*ecr.ImageDetail, 0)

	var wg sync.WaitGroup
	var mu sync.Mutex

	// AWS API expects the length of imageIDs to be at max 100 at a time
	for start := 0; start < imageIDLen; start += 100 {
		end := start + 100
		if end > imageIDLen {
			end = imageIDLen
		}

		wg.Add(1)

		go func(start, end int) {
			defer wg.Done()

			describeResp, err := svc.DescribeImages(&ecr.DescribeImagesInput{
				RepositoryName: &repoName,
				ImageIds:       imageIDs[start:end],
			})
			if err != nil {
				return
			}

			mu.Lock()
			imageDetails = append(imageDetails, describeResp.ImageDetails...)
			mu.Unlock()
		}(start, end)
	}

	wg.Wait()

	res := make([]*ptypes.Image, 0)
	imageInfoMap := make(map[string]*ptypes.Image)

	for _, img := range imageDetails {
		for _, tag := range img.ImageTags {
			newImage := &ptypes.Image{
				Digest:         *img.ImageDigest,
				Tag:            *tag,
				RepositoryName: repoName,
				PushedAt:       img.ImagePushedAt,
			}

			if _, ok := imageInfoMap[*tag]; !ok {
				imageInfoMap[*tag] = newImage
			}
		}
	}

	for _, v := range imageInfoMap {
		res = append(res, v)
	}

	return res, nil
}

func (r *Registry) listACRImages(repoName string, repo repository.Repository) ([]*ptypes.Image, error) {
	az, err := repo.AzureIntegration().ReadAzureIntegration(
		r.ProjectID,
		r.AzureIntegrationID,
	)
	if err != nil {
		return nil, err
	}

	// use JWT token to request catalog
	client := &http.Client{}

	req, err := http.NewRequest(
		"GET",
		fmt.Sprintf("%s/v2/%s/tags/list", r.URL, repoName),
		nil,
	)
	if err != nil {
		return nil, err
	}

	req.SetBasicAuth(az.AzureClientID, string(az.ServicePrincipalSecret))

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}

	gcrResp := gcrImageResp{}

	if err := json.NewDecoder(resp.Body).Decode(&gcrResp); err != nil {
		return nil, fmt.Errorf("Could not read GCR repositories: %v", err)
	}

	res := make([]*ptypes.Image, 0)

	for _, tag := range gcrResp.Tags {
		res = append(res, &ptypes.Image{
			RepositoryName: strings.TrimPrefix(repoName, "https://"),
			Tag:            tag,
		})
	}

	return res, nil
}

type gcrImageResp struct {
	Tags []string `json:"tags"`
}

func (r *Registry) listGCRImages(repoName string, repo repository.Repository) ([]*ptypes.Image, error) {
	gcp, err := repo.GCPIntegration().ReadGCPIntegration(
		r.ProjectID,
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

	res := make([]*ptypes.Image, 0)

	for _, tag := range gcrResp.Tags {
		res = append(res, &ptypes.Image{
			RepositoryName: repoName,
			Tag:            tag,
		})
	}

	return res, nil
}

func (r *Registry) listGARImages(ctx context.Context, repoName string, repo repository.Repository) ([]*ptypes.Image, error) {
	repoImageSlice := strings.Split(repoName, "/")

	if len(repoImageSlice) != 2 {
		return nil, fmt.Errorf("invalid GAR repo name: %s. Expected to be in the form of REPOSITORY/IMAGE", repoName)
	}

	gcpInt, err := repo.GCPIntegration().ReadGCPIntegration(
		r.ProjectID,
		r.GCPIntegrationID,
	)
	if err != nil {
		return nil, err
	}

	svc, err := v1artifactregistry.NewService(ctx, option.WithTokenSource(&garTokenSource{
		reg:  r,
		repo: repo,
		ctx:  ctx,
	}), option.WithScopes("roles/artifactregistry.reader"))
	if err != nil {
		return nil, err
	}

	var res []*ptypes.Image

	parsedURL, err := url.Parse("https://" + r.URL)
	if err != nil {
		return nil, err
	}

	location := strings.TrimSuffix(parsedURL.Host, "-docker.pkg.dev")
	dockerSvc := v1artifactregistry.NewProjectsLocationsRepositoriesDockerImagesService(svc)
	nextToken := ""

	for {
		resp, err := dockerSvc.List(fmt.Sprintf("projects/%s/locations/%s/repositories/%s",
			gcpInt.GCPProjectID, location, repoImageSlice[0])).PageSize(1000).PageToken(nextToken).Do()
		if err != nil {
			return nil, err
		}

		for _, image := range resp.DockerImages {
			named, err := reference.ParseNamed(image.Uri)
			if err != nil {
				continue
			}

			paths := strings.Split(reference.Path(named), "/")

			imageName := paths[len(paths)-1]

			if imageName == repoImageSlice[1] {
				uploadTime, _ := time.Parse(time.RFC3339, image.UploadTime)

				for _, tag := range image.Tags {
					res = append(res, &ptypes.Image{
						RepositoryName: repoName,
						Tag:            tag,
						PushedAt:       &uploadTime,
						Digest:         strings.Split(image.Uri, "@")[1],
					})
				}
			}
		}

		if resp.NextPageToken == "" {
			break
		}

		nextToken = resp.NextPageToken
	}

	return res, nil
}

func (r *Registry) listDOCRImages(
	repoName string,
	repo repository.Repository,
	doAuth *oauth2.Config,
) ([]*ptypes.Image, error) {
	oauthInt, err := repo.OAuthIntegration().ReadOAuthIntegration(
		r.ProjectID,
		r.DOIntegrationID,
	)
	if err != nil {
		return nil, err
	}

	tok, _, err := oauth.GetAccessToken(oauthInt.SharedOAuthModel, doAuth, oauth.MakeUpdateOAuthIntegrationTokenFunction(oauthInt, repo))
	if err != nil {
		return nil, err
	}

	client := godo.NewFromToken(tok)

	urlArr := strings.Split(r.URL, "/")

	if len(urlArr) != 2 {
		return nil, fmt.Errorf("invalid digital ocean registry url")
	}

	name := urlArr[1]

	var tags []*godo.RepositoryTag
	opt := &godo.ListOptions{
		PerPage: 200,
	}

	for {
		nextTags, resp, err := client.Registry.ListRepositoryTags(context.TODO(), name, repoName, opt)
		if err != nil {
			return nil, err
		}

		tags = append(tags, nextTags...)

		if resp.Links == nil || resp.Links.IsLastPage() {
			break
		}

		page, err := resp.Links.CurrentPage()
		if err != nil {
			return nil, err
		}

		opt.Page = page + 1
	}

	res := make([]*ptypes.Image, 0)

	for _, tag := range tags {
		res = append(res, &ptypes.Image{
			RepositoryName: repoName,
			Tag:            tag.Tag,
		})
	}

	return res, nil
}

func (r *Registry) listPrivateRegistryImages(repoName string, repo repository.Repository) ([]*ptypes.Image, error) {
	// handle dockerhub different, as it doesn't implement the docker registry http api
	if strings.Contains(r.URL, "docker.io") {
		return r.listDockerHubImages(repoName, repo)
	}

	basic, err := repo.BasicIntegration().ReadBasicIntegration(
		r.ProjectID,
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

	res := make([]*ptypes.Image, 0)

	for _, tag := range gcrResp.Tags {
		res = append(res, &ptypes.Image{
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

type dockerHubLoginReq struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type dockerHubLoginResp struct {
	Token string `json:"token"`
}

func (r *Registry) listDockerHubImages(repoName string, repo repository.Repository) ([]*ptypes.Image, error) {
	basic, err := repo.BasicIntegration().ReadBasicIntegration(
		r.ProjectID,
		r.BasicIntegrationID,
	)
	if err != nil {
		return nil, err
	}

	client := &http.Client{}

	// first, make a request for the access token

	data, err := json.Marshal(&dockerHubLoginReq{
		Username: string(basic.Username),
		Password: string(basic.Password),
	})
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequest(
		"POST",
		"https://hub.docker.com/v2/users/login",
		strings.NewReader(string(data)),
	)
	if err != nil {
		return nil, err
	}

	req.Header.Add("Content-Type", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}

	tokenObj := dockerHubLoginResp{}

	if err := json.NewDecoder(resp.Body).Decode(&tokenObj); err != nil {
		return nil, fmt.Errorf("Could not decode Dockerhub token from response: %v", err)
	}

	req, err = http.NewRequest(
		"GET",
		fmt.Sprintf("https://hub.docker.com/v2/repositories/%s/tags", strings.Split(r.URL, "docker.io/")[1]),
		nil,
	)

	if err != nil {
		return nil, err
	}

	req.Header.Add("Authorization", fmt.Sprintf("Bearer %s", tokenObj.Token))

	resp, err = client.Do(req)

	if err != nil {
		return nil, err
	}

	imageResp := dockerHubImageResp{}

	if err := json.NewDecoder(resp.Body).Decode(&imageResp); err != nil {
		return nil, fmt.Errorf("Could not read private registry repositories: %v", err)
	}

	res := make([]*ptypes.Image, 0)

	for _, result := range imageResp.Results {
		res = append(res, &ptypes.Image{
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

	if r.AzureIntegrationID != 0 {
		conf, err = r.getACRDockerConfigFile(repo)
	}

	if err != nil {
		return nil, err
	}

	return json.Marshal(conf)
}

func (r *Registry) getECRDockerConfigFile(
	repo repository.Repository,
) (*configfile.ConfigFile, error) {
	aws, err := repo.AWSIntegration().ReadAWSIntegration(
		r.ProjectID,
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
			key: {
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
	gcp, err := repo.GCPIntegration().ReadGCPIntegration(
		r.ProjectID,
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
			parsedURL.Host: {
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
	oauthInt, err := repo.OAuthIntegration().ReadOAuthIntegration(
		r.ProjectID,
		r.DOIntegrationID,
	)
	if err != nil {
		return nil, err
	}

	tok, _, err := oauth.GetAccessToken(oauthInt.SharedOAuthModel, doAuth, oauth.MakeUpdateOAuthIntegrationTokenFunction(oauthInt, repo))
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
			parsedURL.Host: {
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
	basic, err := repo.BasicIntegration().ReadBasicIntegration(
		r.ProjectID,
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
			authConfigKey: {
				Username: string(basic.Username),
				Password: string(basic.Password),
				Auth:     generateAuthToken(string(basic.Username), string(basic.Password)),
			},
		},
	}, nil
}

func (r *Registry) getACRDockerConfigFile(
	repo repository.Repository,
) (*configfile.ConfigFile, error) {
	username, pw, err := r.GetACRCredentials(repo)
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
			parsedURL.Host: {
				Username: string(username),
				Password: string(pw),
				Auth:     generateAuthToken(string(username), string(pw)),
			},
		},
	}, nil
}

func generateAuthToken(username, password string) string {
	return base64.StdEncoding.EncodeToString([]byte(username + ":" + password))
}
