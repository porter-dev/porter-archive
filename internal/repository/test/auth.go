package test

import (
	"errors"

	"github.com/porter-dev/porter/internal/repository"
	"gorm.io/gorm"

	ints "github.com/porter-dev/porter/internal/models/integrations"
)

// KubeIntegrationRepository implements repository.KubeIntegrationRepository
type KubeIntegrationRepository struct {
	canQuery         bool
	kubeIntegrations []*ints.KubeIntegration
}

// NewKubeIntegrationRepository will return errors if canQuery is false
func NewKubeIntegrationRepository(canQuery bool) repository.KubeIntegrationRepository {
	return &KubeIntegrationRepository{
		canQuery,
		[]*ints.KubeIntegration{},
	}
}

// CreateKubeIntegration creates a new kube auth mechanism
func (repo *KubeIntegrationRepository) CreateKubeIntegration(
	am *ints.KubeIntegration,
) (*ints.KubeIntegration, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot write database")
	}

	repo.kubeIntegrations = append(repo.kubeIntegrations, am)
	am.ID = uint(len(repo.kubeIntegrations))

	return am, nil
}

// ReadKubeIntegration finds a kube auth mechanism by id
func (repo *KubeIntegrationRepository) ReadKubeIntegration(
	projectID, id uint,
) (*ints.KubeIntegration, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot read from database")
	}

	if int(id-1) >= len(repo.kubeIntegrations) || repo.kubeIntegrations[id-1] == nil {
		return nil, gorm.ErrRecordNotFound
	}

	index := int(id - 1)
	return repo.kubeIntegrations[index], nil
}

// ListKubeIntegrationsByProjectID finds all kube auth mechanisms
// for a given project id
func (repo *KubeIntegrationRepository) ListKubeIntegrationsByProjectID(
	projectID uint,
) ([]*ints.KubeIntegration, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot read from database")
	}

	res := make([]*ints.KubeIntegration, 0)

	for _, kubeAM := range repo.kubeIntegrations {
		if kubeAM.ProjectID == projectID {
			res = append(res, kubeAM)
		}
	}

	return res, nil
}

// BasicIntegrationRepository implements repository.BasicIntegrationRepository
type BasicIntegrationRepository struct {
	canQuery          bool
	basicIntegrations []*ints.BasicIntegration
}

// NewBasicIntegrationRepository will return errors if canQuery is false
func NewBasicIntegrationRepository(canQuery bool) repository.BasicIntegrationRepository {
	return &BasicIntegrationRepository{
		canQuery,
		[]*ints.BasicIntegration{},
	}
}

// CreateBasicIntegration creates a new basic auth mechanism
func (repo *BasicIntegrationRepository) CreateBasicIntegration(
	am *ints.BasicIntegration,
) (*ints.BasicIntegration, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot write database")
	}

	repo.basicIntegrations = append(repo.basicIntegrations, am)
	am.ID = uint(len(repo.basicIntegrations))

	return am, nil
}

// ReadBasicIntegration finds a basic auth mechanism by id
func (repo *BasicIntegrationRepository) ReadBasicIntegration(
	projectID, id uint,
) (*ints.BasicIntegration, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot read from database")
	}

	if int(id-1) >= len(repo.basicIntegrations) || repo.basicIntegrations[id-1] == nil {
		return nil, gorm.ErrRecordNotFound
	}

	index := int(id - 1)
	return repo.basicIntegrations[index], nil
}

// ListBasicIntegrationsByProjectID finds all basic auth mechanisms
// for a given project id
func (repo *BasicIntegrationRepository) ListBasicIntegrationsByProjectID(
	projectID uint,
) ([]*ints.BasicIntegration, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot read from database")
	}

	res := make([]*ints.BasicIntegration, 0)

	for _, basicAM := range repo.basicIntegrations {
		if basicAM.ProjectID == projectID {
			res = append(res, basicAM)
		}
	}

	return res, nil
}

// DeleteBasicIntegration deletes a basic integration
func (repo *BasicIntegrationRepository) DeleteBasicIntegration(
	am *ints.BasicIntegration,
) (*ints.BasicIntegration, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot read from database")
	}

	var newInts []*ints.BasicIntegration

	for _, basicInt := range repo.basicIntegrations {
		if basicInt.ID != am.ID {
			newInts = append(newInts, basicInt)
		}
	}

	repo.basicIntegrations = newInts

	return am, nil
}

// OIDCIntegrationRepository implements repository.OIDCIntegrationRepository
type OIDCIntegrationRepository struct {
	canQuery         bool
	oidcIntegrations []*ints.OIDCIntegration
}

// NewOIDCIntegrationRepository will return errors if canQuery is false
func NewOIDCIntegrationRepository(canQuery bool) repository.OIDCIntegrationRepository {
	return &OIDCIntegrationRepository{
		canQuery,
		[]*ints.OIDCIntegration{},
	}
}

// CreateOIDCIntegration creates a new oidc auth mechanism
func (repo *OIDCIntegrationRepository) CreateOIDCIntegration(
	am *ints.OIDCIntegration,
) (*ints.OIDCIntegration, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot write database")
	}

	repo.oidcIntegrations = append(repo.oidcIntegrations, am)
	am.ID = uint(len(repo.oidcIntegrations))

	return am, nil
}

// ReadOIDCIntegration finds a oidc auth mechanism by id
func (repo *OIDCIntegrationRepository) ReadOIDCIntegration(
	projectID, id uint,
) (*ints.OIDCIntegration, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot read from database")
	}

	if int(id-1) >= len(repo.oidcIntegrations) || repo.oidcIntegrations[id-1] == nil {
		return nil, gorm.ErrRecordNotFound
	}

	index := int(id - 1)
	return repo.oidcIntegrations[index], nil
}

// ListOIDCIntegrationsByProjectID finds all oidc auth mechanisms
// for a given project id
func (repo *OIDCIntegrationRepository) ListOIDCIntegrationsByProjectID(
	projectID uint,
) ([]*ints.OIDCIntegration, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot read from database")
	}

	res := make([]*ints.OIDCIntegration, 0)

	for _, oidcAM := range repo.oidcIntegrations {
		if oidcAM.ProjectID == projectID {
			res = append(res, oidcAM)
		}
	}

	return res, nil
}

// OAuthIntegrationRepository implements repository.OAuthIntegrationRepository
type OAuthIntegrationRepository struct {
	canQuery      bool
	oIntegrations []*ints.OAuthIntegration
}

// NewOAuthIntegrationRepository will return errors if canQuery is false
func NewOAuthIntegrationRepository(canQuery bool) repository.OAuthIntegrationRepository {
	return &OAuthIntegrationRepository{
		canQuery,
		[]*ints.OAuthIntegration{},
	}
}

// CreateOAuthIntegration creates a new o auth mechanism
func (repo *OAuthIntegrationRepository) CreateOAuthIntegration(
	am *ints.OAuthIntegration,
) (*ints.OAuthIntegration, error) {
	if !repo.canQuery {
		return nil, errors.New("cannot write database")
	}

	repo.oIntegrations = append(repo.oIntegrations, am)
	am.ID = uint(len(repo.oIntegrations))

	return am, nil
}

// ReadOAuthIntegration finds a o auth mechanism by id
func (repo *OAuthIntegrationRepository) ReadOAuthIntegration(
	projectID, id uint,
) (*ints.OAuthIntegration, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot read from database")
	}

	if int(id-1) >= len(repo.oIntegrations) || repo.oIntegrations[id-1] == nil {
		return nil, gorm.ErrRecordNotFound
	}

	index := int(id - 1)
	return repo.oIntegrations[index], nil
}

// ListOAuthIntegrationsByProjectID finds all o auth mechanisms
// for a given project id
func (repo *OAuthIntegrationRepository) ListOAuthIntegrationsByProjectID(
	projectID uint,
) ([]*ints.OAuthIntegration, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot read from database")
	}

	res := make([]*ints.OAuthIntegration, 0)

	for _, oAM := range repo.oIntegrations {
		if oAM.ProjectID == projectID {
			res = append(res, oAM)
		}
	}

	return res, nil
}

// UpdateOAuthIntegration updates an oauth integration in the DB
func (repo *OAuthIntegrationRepository) UpdateOAuthIntegration(
	am *ints.OAuthIntegration,
) (*ints.OAuthIntegration, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot write database")
	}

	if int(am.ID-1) >= len(repo.oIntegrations) || repo.oIntegrations[am.ID-1] == nil {
		return nil, gorm.ErrRecordNotFound
	}

	index := int(am.ID - 1)
	repo.oIntegrations[index] = am

	return am, nil
}

// AWSIntegrationRepository implements repository.AWSIntegrationRepository
type AWSIntegrationRepository struct {
	canQuery        bool
	awsIntegrations []*ints.AWSIntegration
}

// NewAWSIntegrationRepository will return errors if canQuery is false
func NewAWSIntegrationRepository(canQuery bool) repository.AWSIntegrationRepository {
	return &AWSIntegrationRepository{
		canQuery,
		[]*ints.AWSIntegration{},
	}
}

// CreateAWSIntegration creates a new aws auth mechanism
func (repo *AWSIntegrationRepository) CreateAWSIntegration(
	am *ints.AWSIntegration,
) (*ints.AWSIntegration, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot write database")
	}

	repo.awsIntegrations = append(repo.awsIntegrations, am)
	am.ID = uint(len(repo.awsIntegrations))

	return am, nil
}

func (repo *AWSIntegrationRepository) OverwriteAWSIntegration(
	am *ints.AWSIntegration,
) (*ints.AWSIntegration, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot write database")
	}

	if int(am.ID-1) >= len(repo.awsIntegrations) || repo.awsIntegrations[am.ID-1] == nil {
		return nil, gorm.ErrRecordNotFound
	}

	index := int(am.ID - 1)
	repo.awsIntegrations[index] = am

	return am, nil
}

// ReadAWSIntegration finds a aws auth mechanism by id
func (repo *AWSIntegrationRepository) ReadAWSIntegration(
	projectID, id uint,
) (*ints.AWSIntegration, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot read from database")
	}

	if int(id-1) >= len(repo.awsIntegrations) || repo.awsIntegrations[id-1] == nil {
		return nil, gorm.ErrRecordNotFound
	}

	index := int(id - 1)
	return repo.awsIntegrations[index], nil
}

// ListAWSIntegrationsByProjectID finds all aws auth mechanisms
// for a given project id
func (repo *AWSIntegrationRepository) ListAWSIntegrationsByProjectID(
	projectID uint,
) ([]*ints.AWSIntegration, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot read from database")
	}

	res := make([]*ints.AWSIntegration, 0)

	for _, awsAM := range repo.awsIntegrations {
		if awsAM.ProjectID == projectID {
			res = append(res, awsAM)
		}
	}

	return res, nil
}

// GCPIntegrationRepository implements repository.GCPIntegrationRepository
type GCPIntegrationRepository struct {
	canQuery        bool
	gcpIntegrations []*ints.GCPIntegration
}

// NewGCPIntegrationRepository will return errors if canQuery is false
func NewGCPIntegrationRepository(canQuery bool) repository.GCPIntegrationRepository {
	return &GCPIntegrationRepository{
		canQuery,
		[]*ints.GCPIntegration{},
	}
}

// CreateGCPIntegration creates a new gcp auth mechanism
func (repo *GCPIntegrationRepository) CreateGCPIntegration(
	am *ints.GCPIntegration,
) (*ints.GCPIntegration, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot write database")
	}

	repo.gcpIntegrations = append(repo.gcpIntegrations, am)
	am.ID = uint(len(repo.gcpIntegrations))

	return am, nil
}

// ReadGCPIntegration finds a gcp auth mechanism by id
func (repo *GCPIntegrationRepository) ReadGCPIntegration(
	projectID, id uint,
) (*ints.GCPIntegration, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot read from database")
	}

	if int(id-1) >= len(repo.gcpIntegrations) || repo.gcpIntegrations[id-1] == nil {
		return nil, gorm.ErrRecordNotFound
	}

	index := int(id - 1)
	return repo.gcpIntegrations[index], nil
}

// ListGCPIntegrationsByProjectID finds all gcp auth mechanisms
// for a given project id
func (repo *GCPIntegrationRepository) ListGCPIntegrationsByProjectID(
	projectID uint,
) ([]*ints.GCPIntegration, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot read from database")
	}

	res := make([]*ints.GCPIntegration, 0)

	for _, gcpAM := range repo.gcpIntegrations {
		if gcpAM.ProjectID == projectID {
			res = append(res, gcpAM)
		}
	}

	return res, nil
}

// GithubAppInstallationRepository implements repository.GithubAppInstallationRepository
type GithubAppInstallationRepository struct {
	canQuery               bool
	githubAppInstallations []*ints.GithubAppInstallation
}

func NewGithubAppInstallationRepository(canQuery bool) repository.GithubAppInstallationRepository {
	return &GithubAppInstallationRepository{
		canQuery,
		[]*ints.GithubAppInstallation{},
	}
}

func (repo *GithubAppInstallationRepository) CreateGithubAppInstallation(am *ints.GithubAppInstallation) (*ints.GithubAppInstallation, error) {
	if !repo.canQuery {
		return nil, errors.New("cannot write database")
	}

	repo.githubAppInstallations = append(repo.githubAppInstallations, am)
	am.ID = uint(len(repo.githubAppInstallations))

	return am, nil
}

func (repo *GithubAppInstallationRepository) ReadGithubAppInstallation(projectID, id uint) (*ints.GithubAppInstallation, error) {
	if !repo.canQuery {
		return nil, errors.New("cannot write database")
	}

	if int(id-1) >= len(repo.githubAppInstallations) || repo.githubAppInstallations[id-1] == nil {
		return nil, gorm.ErrRecordNotFound
	}

	return repo.githubAppInstallations[int(id-1)], nil
}

func (repo *GithubAppInstallationRepository) ReadGithubAppInstallationByInstallationID(gaID uint) (*ints.GithubAppInstallation, error) {
	panic("unimplemented")
}

func (repo *GithubAppInstallationRepository) ReadGithubAppInstallationByAccountID(accountID int64) (*ints.GithubAppInstallation, error) {

	if !repo.canQuery {
		return nil, errors.New("cannot write database")
	}

	for _, installation := range repo.githubAppInstallations {
		if installation != nil && installation.AccountID == accountID {
			return installation, nil
		}
	}

	return nil, gorm.ErrRecordNotFound
}

func (repo *GithubAppInstallationRepository) ReadGithubAppInstallationByAccountIDs(accountIDs []int64) ([]*ints.GithubAppInstallation, error) {

	if !repo.canQuery {
		return nil, errors.New("cannot write database")
	}

	ret := make([]*ints.GithubAppInstallation, 0)

	for _, installation := range repo.githubAppInstallations {
		// O(n^2) can be made into O(n) if this is too slow
		for _, id := range accountIDs {
			if installation.AccountID == id {
				ret = append(ret, installation)
			}
		}
	}

	return ret, nil
}

func (repo *GithubAppInstallationRepository) DeleteGithubAppInstallationByAccountID(accountID int64) error {
	if !repo.canQuery {
		return errors.New("cannot write database")
	}

	for i, installation := range repo.githubAppInstallations {
		if installation != nil && installation.AccountID == accountID {
			repo.githubAppInstallations[i] = nil
		}
	}

	return nil
}

type GithubAppOAuthIntegrationRepository struct {
	canQuery                   bool
	githubAppOauthIntegrations []*ints.GithubAppOAuthIntegration
}

func NewGithubAppOAuthIntegrationRepository(canQuery bool) repository.GithubAppOAuthIntegrationRepository {
	return &GithubAppOAuthIntegrationRepository{
		canQuery,
		[]*ints.GithubAppOAuthIntegration{},
	}
}

func (repo *GithubAppOAuthIntegrationRepository) CreateGithubAppOAuthIntegration(am *ints.GithubAppOAuthIntegration) (*ints.GithubAppOAuthIntegration, error) {
	if !repo.canQuery {
		return nil, errors.New("cannot write database")
	}

	repo.githubAppOauthIntegrations = append(repo.githubAppOauthIntegrations, am)
	am.ID = uint(len(repo.githubAppOauthIntegrations))

	return am, nil
}

func (repo *GithubAppOAuthIntegrationRepository) ReadGithubAppOauthIntegration(id uint) (*ints.GithubAppOAuthIntegration, error) {
	if !repo.canQuery {
		return nil, errors.New("cannot write database")
	}

	if int(id-1) >= len(repo.githubAppOauthIntegrations) || repo.githubAppOauthIntegrations[id-1] == nil {
		return nil, gorm.ErrRecordNotFound
	}

	return repo.githubAppOauthIntegrations[int(id-1)], nil
}

func (repo *GithubAppOAuthIntegrationRepository) UpdateGithubAppOauthIntegration(am *ints.GithubAppOAuthIntegration) (*ints.GithubAppOAuthIntegration, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot write database")
	}

	if int(am.ID-1) >= len(repo.githubAppOauthIntegrations) || repo.githubAppOauthIntegrations[am.ID-1] == nil {
		return nil, gorm.ErrRecordNotFound
	}

	index := int(am.ID - 1)
	repo.githubAppOauthIntegrations[index] = am

	return am, nil
}

// AzureIntegrationRepository (unimplemented)
type AzureIntegrationRepository struct {
}

// NewAzureIntegrationRepository returns a AzureIntegrationRepository which uses
// gorm.DB for querying the database. It accepts an encryption key to encrypt
// sensitive data
func NewAzureIntegrationRepository() repository.AzureIntegrationRepository {
	return &AzureIntegrationRepository{}
}

// CreateAzureIntegration creates a new Azure auth mechanism
func (repo *AzureIntegrationRepository) CreateAzureIntegration(
	az *ints.AzureIntegration,
) (*ints.AzureIntegration, error) {
	panic("unimplemented")
}

// OverwriteAzureIntegration overwrites the Azure credential in the DB
func (repo *AzureIntegrationRepository) OverwriteAzureIntegration(
	az *ints.AzureIntegration,
) (*ints.AzureIntegration, error) {
	panic("unimplemented")
}

// ReadAzureIntegration finds a Azure auth mechanism by id
func (repo *AzureIntegrationRepository) ReadAzureIntegration(
	projectID, id uint,
) (*ints.AzureIntegration, error) {
	panic("unimplemented")
}

// ListAzureIntegrationsByProjectID finds all Azure auth mechanisms
// for a given project id
func (repo *AzureIntegrationRepository) ListAzureIntegrationsByProjectID(
	projectID uint,
) ([]*ints.AzureIntegration, error) {
	panic("unimplemented")
}

type GitlabIntegrationRepository struct {
	canQuery           bool
	gitlabIntegrations []*ints.GitlabIntegration
}

func NewGitlabIntegrationRepository(canQuery bool) repository.GitlabIntegrationRepository {
	return &GitlabIntegrationRepository{
		canQuery,
		[]*ints.GitlabIntegration{},
	}
}

func (repo *GitlabIntegrationRepository) CreateGitlabIntegration(gi *ints.GitlabIntegration) (*ints.GitlabIntegration, error) {
	if !repo.canQuery {
		return nil, errors.New("cannot write database")
	}

	repo.gitlabIntegrations = append(repo.gitlabIntegrations, gi)
	gi.ID = uint(len(repo.gitlabIntegrations))

	return gi, nil
}

func (repo *GitlabIntegrationRepository) ReadGitlabIntegration(projectID, id uint) (*ints.GitlabIntegration, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot read from database")
	}

	if int(id-1) >= len(repo.gitlabIntegrations) || repo.gitlabIntegrations[id-1] == nil {
		return nil, gorm.ErrRecordNotFound
	}

	index := int(id - 1)
	return repo.gitlabIntegrations[index], nil
}
func (repo *GitlabIntegrationRepository) ListGitlabIntegrationsByProjectID(projectID uint) ([]*ints.GitlabIntegration, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot read from database")
	}

	res := make([]*ints.GitlabIntegration, 0)

	for _, gitlabAM := range repo.gitlabIntegrations {
		if gitlabAM.ProjectID == projectID {
			res = append(res, gitlabAM)
		}
	}

	return res, nil
}

type GitlabAppOAuthIntegrationRepository struct {
	canQuery                   bool
	gitlabAppOAuthIntegrations []*ints.GitlabAppOAuthIntegration
}

func NewGitlabAppOAuthIntegrationRepository(canQuery bool) repository.GitlabAppOAuthIntegrationRepository {
	return &GitlabAppOAuthIntegrationRepository{
		canQuery,
		[]*ints.GitlabAppOAuthIntegration{},
	}
}

func (repo *GitlabAppOAuthIntegrationRepository) CreateGitlabAppOAuthIntegration(
	gi *ints.GitlabAppOAuthIntegration,
) (*ints.GitlabAppOAuthIntegration, error) {
	if !repo.canQuery {
		return nil, errors.New("cannot write database")
	}

	repo.gitlabAppOAuthIntegrations = append(repo.gitlabAppOAuthIntegrations, gi)
	gi.ID = uint(len(repo.gitlabAppOAuthIntegrations))

	return gi, nil
}

func (repo *GitlabAppOAuthIntegrationRepository) ReadGitlabAppOAuthIntegration(
	userID, projectID, integrationID uint,
) (*ints.GitlabAppOAuthIntegration, error) {
	panic("not implemented")
}
