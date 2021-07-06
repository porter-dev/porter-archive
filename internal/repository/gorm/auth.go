package gorm

import (
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"gorm.io/gorm"

	ints "github.com/porter-dev/porter/internal/models/integrations"
)

// KubeIntegrationRepository uses gorm.DB for querying the database
type KubeIntegrationRepository struct {
	db  *gorm.DB
	key *[32]byte
}

// NewKubeIntegrationRepository returns a KubeIntegrationRepository which uses
// gorm.DB for querying the database. It accepts an encryption key to encrypt
// sensitive data
func NewKubeIntegrationRepository(
	db *gorm.DB,
	key *[32]byte,
) repository.KubeIntegrationRepository {
	return &KubeIntegrationRepository{db, key}
}

// CreateKubeIntegration creates a new kube auth mechanism
func (repo *KubeIntegrationRepository) CreateKubeIntegration(
	am *ints.KubeIntegration,
) (*ints.KubeIntegration, error) {
	err := repo.EncryptKubeIntegrationData(am, repo.key)

	if err != nil {
		return nil, err
	}

	project := &models.Project{}

	if err := repo.db.Where("id = ?", am.ProjectID).First(&project).Error; err != nil {
		return nil, err
	}

	assoc := repo.db.Model(&project).Association("KubeIntegrations")

	if assoc.Error != nil {
		return nil, assoc.Error
	}

	if err := assoc.Append(am); err != nil {
		return nil, err
	}

	return am, nil
}

// ReadKubeIntegration finds a kube auth mechanism by id
func (repo *KubeIntegrationRepository) ReadKubeIntegration(
	id uint,
) (*ints.KubeIntegration, error) {
	ki := &ints.KubeIntegration{}

	if err := repo.db.Where("id = ?", id).First(&ki).Error; err != nil {
		return nil, err
	}

	err := repo.DecryptKubeIntegrationData(ki, repo.key)

	if err != nil {
		return nil, err
	}

	return ki, nil
}

// ListKubeIntegrationsByProjectID finds all kube auth mechanisms
// for a given project id
func (repo *KubeIntegrationRepository) ListKubeIntegrationsByProjectID(
	projectID uint,
) ([]*ints.KubeIntegration, error) {
	kis := []*ints.KubeIntegration{}

	if err := repo.db.Where("project_id = ?", projectID).Find(&kis).Error; err != nil {
		return nil, err
	}

	for _, ki := range kis {
		repo.DecryptKubeIntegrationData(ki, repo.key)
	}

	return kis, nil
}

// EncryptKubeIntegrationData will encrypt the kube integration data before
// writing to the DB
func (repo *KubeIntegrationRepository) EncryptKubeIntegrationData(
	ki *ints.KubeIntegration,
	key *[32]byte,
) error {
	if len(ki.ClientCertificateData) > 0 {
		cipherData, err := repository.Encrypt(ki.ClientCertificateData, key)

		if err != nil {
			return err
		}

		ki.ClientCertificateData = cipherData
	}

	if len(ki.ClientKeyData) > 0 {
		cipherData, err := repository.Encrypt(ki.ClientKeyData, key)

		if err != nil {
			return err
		}

		ki.ClientKeyData = cipherData
	}

	if len(ki.Token) > 0 {
		cipherData, err := repository.Encrypt(ki.Token, key)

		if err != nil {
			return err
		}

		ki.Token = cipherData
	}

	if len(ki.Username) > 0 {
		cipherData, err := repository.Encrypt(ki.Username, key)

		if err != nil {
			return err
		}

		ki.Username = cipherData
	}

	if len(ki.Password) > 0 {
		cipherData, err := repository.Encrypt(ki.Password, key)

		if err != nil {
			return err
		}

		ki.Password = cipherData
	}

	if len(ki.Kubeconfig) > 0 {
		cipherData, err := repository.Encrypt(ki.Kubeconfig, key)

		if err != nil {
			return err
		}

		ki.Kubeconfig = cipherData
	}

	return nil
}

// DecryptKubeIntegrationData will decrypt the kube integration data before
// returning it from the DB
func (repo *KubeIntegrationRepository) DecryptKubeIntegrationData(
	ki *ints.KubeIntegration,
	key *[32]byte,
) error {
	if len(ki.ClientCertificateData) > 0 {
		plaintext, err := repository.Decrypt(ki.ClientCertificateData, key)

		if err != nil {
			return err
		}

		ki.ClientCertificateData = plaintext
	}

	if len(ki.ClientKeyData) > 0 {
		plaintext, err := repository.Decrypt(ki.ClientKeyData, key)

		if err != nil {
			return err
		}

		ki.ClientKeyData = plaintext
	}

	if len(ki.Token) > 0 {
		plaintext, err := repository.Decrypt(ki.Token, key)

		if err != nil {
			return err
		}

		ki.Token = plaintext
	}

	if len(ki.Username) > 0 {
		plaintext, err := repository.Decrypt(ki.Username, key)

		if err != nil {
			return err
		}

		ki.Username = plaintext
	}

	if len(ki.Password) > 0 {
		plaintext, err := repository.Decrypt(ki.Password, key)

		if err != nil {
			return err
		}

		ki.Password = plaintext
	}

	if len(ki.Kubeconfig) > 0 {
		plaintext, err := repository.Decrypt(ki.Kubeconfig, key)

		if err != nil {
			return err
		}

		ki.Kubeconfig = plaintext
	}

	return nil
}

// BasicIntegrationRepository uses gorm.DB for querying the database
type BasicIntegrationRepository struct {
	db  *gorm.DB
	key *[32]byte
}

// NewBasicIntegrationRepository returns a BasicIntegrationRepository which uses
// gorm.DB for querying the database. It accepts an encryption key to encrypt
// sensitive data
func NewBasicIntegrationRepository(
	db *gorm.DB,
	key *[32]byte,
) repository.BasicIntegrationRepository {
	return &BasicIntegrationRepository{db, key}
}

// CreateBasicIntegration creates a new basic auth mechanism
func (repo *BasicIntegrationRepository) CreateBasicIntegration(
	am *ints.BasicIntegration,
) (*ints.BasicIntegration, error) {
	err := repo.EncryptBasicIntegrationData(am, repo.key)

	if err != nil {
		return nil, err
	}

	project := &models.Project{}

	if err := repo.db.Where("id = ?", am.ProjectID).First(&project).Error; err != nil {
		return nil, err
	}

	assoc := repo.db.Model(&project).Association("BasicIntegrations")

	if assoc.Error != nil {
		return nil, assoc.Error
	}

	if err := assoc.Append(am); err != nil {
		return nil, err
	}

	return am, nil
}

// ReadBasicIntegration finds a basic auth mechanism by id
func (repo *BasicIntegrationRepository) ReadBasicIntegration(
	id uint,
) (*ints.BasicIntegration, error) {
	basic := &ints.BasicIntegration{}

	if err := repo.db.Where("id = ?", id).First(&basic).Error; err != nil {
		return nil, err
	}

	err := repo.DecryptBasicIntegrationData(basic, repo.key)

	if err != nil {
		return nil, err
	}

	return basic, nil
}

// ListBasicIntegrationsByProjectID finds all basic auth mechanisms
// for a given project id
func (repo *BasicIntegrationRepository) ListBasicIntegrationsByProjectID(
	projectID uint,
) ([]*ints.BasicIntegration, error) {
	basics := []*ints.BasicIntegration{}

	if err := repo.db.Where("project_id = ?", projectID).Find(&basics).Error; err != nil {
		return nil, err
	}

	for _, basic := range basics {
		repo.DecryptBasicIntegrationData(basic, repo.key)
	}

	return basics, nil
}

// EncryptBasicIntegrationData will encrypt the basic integration data before
// writing to the DB
func (repo *BasicIntegrationRepository) EncryptBasicIntegrationData(
	basic *ints.BasicIntegration,
	key *[32]byte,
) error {
	if len(basic.Username) > 0 {
		cipherData, err := repository.Encrypt(basic.Username, key)

		if err != nil {
			return err
		}

		basic.Username = cipherData
	}

	if len(basic.Password) > 0 {
		cipherData, err := repository.Encrypt(basic.Password, key)

		if err != nil {
			return err
		}

		basic.Password = cipherData
	}

	return nil
}

// DecryptBasicIntegrationData will decrypt the basic integration data before
// returning it from the DB
func (repo *BasicIntegrationRepository) DecryptBasicIntegrationData(
	basic *ints.BasicIntegration,
	key *[32]byte,
) error {
	if len(basic.Username) > 0 {
		plaintext, err := repository.Decrypt(basic.Username, key)

		if err != nil {
			return err
		}

		basic.Username = plaintext
	}

	if len(basic.Password) > 0 {
		plaintext, err := repository.Decrypt(basic.Password, key)

		if err != nil {
			return err
		}

		basic.Password = plaintext
	}

	return nil
}

// OIDCIntegrationRepository uses gorm.DB for querying the database
type OIDCIntegrationRepository struct {
	db  *gorm.DB
	key *[32]byte
}

// NewOIDCIntegrationRepository returns a OIDCIntegrationRepository which uses
// gorm.DB for querying the database. It accepts an encryption key to encrypt
// sensitive data
func NewOIDCIntegrationRepository(
	db *gorm.DB,
	key *[32]byte,
) repository.OIDCIntegrationRepository {
	return &OIDCIntegrationRepository{db, key}
}

// CreateOIDCIntegration creates a new oidc auth mechanism
func (repo *OIDCIntegrationRepository) CreateOIDCIntegration(
	am *ints.OIDCIntegration,
) (*ints.OIDCIntegration, error) {
	err := repo.EncryptOIDCIntegrationData(am, repo.key)

	if err != nil {
		return nil, err
	}

	project := &models.Project{}

	if err := repo.db.Where("id = ?", am.ProjectID).First(&project).Error; err != nil {
		return nil, err
	}

	assoc := repo.db.Model(&project).Association("OIDCIntegrations")

	if assoc.Error != nil {
		return nil, assoc.Error
	}

	if err := assoc.Append(am); err != nil {
		return nil, err
	}

	return am, nil
}

// ReadOIDCIntegration finds a oidc auth mechanism by id
func (repo *OIDCIntegrationRepository) ReadOIDCIntegration(
	id uint,
) (*ints.OIDCIntegration, error) {
	oidc := &ints.OIDCIntegration{}

	if err := repo.db.Where("id = ?", id).First(&oidc).Error; err != nil {
		return nil, err
	}

	err := repo.DecryptOIDCIntegrationData(oidc, repo.key)

	if err != nil {
		return nil, err
	}

	return oidc, nil
}

// ListOIDCIntegrationsByProjectID finds all oidc auth mechanisms
// for a given project id
func (repo *OIDCIntegrationRepository) ListOIDCIntegrationsByProjectID(
	projectID uint,
) ([]*ints.OIDCIntegration, error) {
	oidcs := []*ints.OIDCIntegration{}

	if err := repo.db.Where("project_id = ?", projectID).Find(&oidcs).Error; err != nil {
		return nil, err
	}

	for _, oidc := range oidcs {
		repo.DecryptOIDCIntegrationData(oidc, repo.key)
	}

	return oidcs, nil
}

// EncryptOIDCIntegrationData will encrypt the oidc integration data before
// writing to the DB
func (repo *OIDCIntegrationRepository) EncryptOIDCIntegrationData(
	oidc *ints.OIDCIntegration,
	key *[32]byte,
) error {
	if len(oidc.IssuerURL) > 0 {
		cipherData, err := repository.Encrypt(oidc.IssuerURL, key)

		if err != nil {
			return err
		}

		oidc.IssuerURL = cipherData
	}

	if len(oidc.ClientID) > 0 {
		cipherData, err := repository.Encrypt(oidc.ClientID, key)

		if err != nil {
			return err
		}

		oidc.ClientID = cipherData
	}

	if len(oidc.ClientSecret) > 0 {
		cipherData, err := repository.Encrypt(oidc.ClientSecret, key)

		if err != nil {
			return err
		}

		oidc.ClientSecret = cipherData
	}

	if len(oidc.CertificateAuthorityData) > 0 {
		cipherData, err := repository.Encrypt(oidc.CertificateAuthorityData, key)

		if err != nil {
			return err
		}

		oidc.CertificateAuthorityData = cipherData
	}

	if len(oidc.IDToken) > 0 {
		cipherData, err := repository.Encrypt(oidc.IDToken, key)

		if err != nil {
			return err
		}

		oidc.IDToken = cipherData
	}

	if len(oidc.RefreshToken) > 0 {
		cipherData, err := repository.Encrypt(oidc.RefreshToken, key)

		if err != nil {
			return err
		}

		oidc.RefreshToken = cipherData
	}

	return nil
}

// DecryptOIDCIntegrationData will decrypt the kube integration data before
// returning it from the DB
func (repo *OIDCIntegrationRepository) DecryptOIDCIntegrationData(
	oidc *ints.OIDCIntegration,
	key *[32]byte,
) error {
	if len(oidc.IssuerURL) > 0 {
		plaintext, err := repository.Decrypt(oidc.IssuerURL, key)

		if err != nil {
			return err
		}

		oidc.IssuerURL = plaintext
	}

	if len(oidc.ClientID) > 0 {
		plaintext, err := repository.Decrypt(oidc.ClientID, key)

		if err != nil {
			return err
		}

		oidc.ClientID = plaintext
	}

	if len(oidc.ClientSecret) > 0 {
		plaintext, err := repository.Decrypt(oidc.ClientSecret, key)

		if err != nil {
			return err
		}

		oidc.ClientSecret = plaintext
	}

	if len(oidc.CertificateAuthorityData) > 0 {
		plaintext, err := repository.Decrypt(oidc.CertificateAuthorityData, key)

		if err != nil {
			return err
		}

		oidc.CertificateAuthorityData = plaintext
	}

	if len(oidc.IDToken) > 0 {
		plaintext, err := repository.Decrypt(oidc.IDToken, key)

		if err != nil {
			return err
		}

		oidc.IDToken = plaintext
	}

	if len(oidc.RefreshToken) > 0 {
		plaintext, err := repository.Decrypt(oidc.RefreshToken, key)

		if err != nil {
			return err
		}

		oidc.RefreshToken = plaintext
	}

	return nil
}

// OAuthIntegrationRepository uses gorm.DB for querying the database
type OAuthIntegrationRepository struct {
	db  *gorm.DB
	key *[32]byte
}

// NewOAuthIntegrationRepository returns a OAuthIntegrationRepository which uses
// gorm.DB for querying the database. It accepts an encryption key to encrypt
// sensitive data
func NewOAuthIntegrationRepository(
	db *gorm.DB,
	key *[32]byte,
) repository.OAuthIntegrationRepository {
	return &OAuthIntegrationRepository{db, key}
}

// CreateOAuthIntegration creates a new oauth auth mechanism
func (repo *OAuthIntegrationRepository) CreateOAuthIntegration(
	am *ints.OAuthIntegration,
) (*ints.OAuthIntegration, error) {
	err := repo.EncryptOAuthIntegrationData(am, repo.key)

	if err != nil {
		return nil, err
	}

	project := &models.Project{}

	if err := repo.db.Where("id = ?", am.ProjectID).First(&project).Error; err != nil {
		return nil, err
	}

	assoc := repo.db.Model(&project).Association("OAuthIntegrations")

	if assoc.Error != nil {
		return nil, assoc.Error
	}

	if err := assoc.Append(am); err != nil {
		return nil, err
	}

	return am, nil
}

// ReadOAuthIntegration finds a oauth auth mechanism by id
func (repo *OAuthIntegrationRepository) ReadOAuthIntegration(
	id uint,
) (*ints.OAuthIntegration, error) {
	oauth := &ints.OAuthIntegration{}

	if err := repo.db.Where("id = ?", id).First(&oauth).Error; err != nil {
		return nil, err
	}

	err := repo.DecryptOAuthIntegrationData(oauth, repo.key)

	if err != nil {
		return nil, err
	}

	return oauth, nil
}

// ListOAuthIntegrationsByProjectID finds all oauth auth mechanisms
// for a given project id
func (repo *OAuthIntegrationRepository) ListOAuthIntegrationsByProjectID(
	projectID uint,
) ([]*ints.OAuthIntegration, error) {
	oauths := []*ints.OAuthIntegration{}

	if err := repo.db.Where("project_id = ?", projectID).Find(&oauths).Error; err != nil {
		return nil, err
	}

	for _, oauth := range oauths {
		repo.DecryptOAuthIntegrationData(oauth, repo.key)
	}

	return oauths, nil
}

// UpdateOAuthIntegration modifies an existing oauth integration in the database
func (repo *OAuthIntegrationRepository) UpdateOAuthIntegration(
	am *ints.OAuthIntegration,
) (*ints.OAuthIntegration, error) {
	err := repo.EncryptOAuthIntegrationData(am, repo.key)

	if err != nil {
		return nil, err
	}

	if err := repo.db.Save(am).Error; err != nil {
		return nil, err
	}

	err = repo.DecryptOAuthIntegrationData(am, repo.key)

	if err != nil {
		return nil, err
	}

	return am, nil
}

// EncryptOAuthIntegrationData will encrypt the oauth integration data before
// writing to the DB
func (repo *OAuthIntegrationRepository) EncryptOAuthIntegrationData(
	oauth *ints.OAuthIntegration,
	key *[32]byte,
) error {
	if len(oauth.ClientID) > 0 {
		cipherData, err := repository.Encrypt(oauth.ClientID, key)

		if err != nil {
			return err
		}

		oauth.ClientID = cipherData
	}

	if len(oauth.AccessToken) > 0 {
		cipherData, err := repository.Encrypt(oauth.AccessToken, key)

		if err != nil {
			return err
		}

		oauth.AccessToken = cipherData
	}

	if len(oauth.RefreshToken) > 0 {
		cipherData, err := repository.Encrypt(oauth.RefreshToken, key)

		if err != nil {
			return err
		}

		oauth.RefreshToken = cipherData
	}

	return nil
}

// DecryptOAuthIntegrationData will decrypt the oauth integration data before
// returning it from the DB
func (repo *OAuthIntegrationRepository) DecryptOAuthIntegrationData(
	oauth *ints.OAuthIntegration,
	key *[32]byte,
) error {
	if len(oauth.ClientID) > 0 {
		plaintext, err := repository.Decrypt(oauth.ClientID, key)

		if err != nil {
			return err
		}

		oauth.ClientID = plaintext
	}

	if len(oauth.AccessToken) > 0 {
		plaintext, err := repository.Decrypt(oauth.AccessToken, key)

		if err != nil {
			return err
		}

		oauth.AccessToken = plaintext
	}

	if len(oauth.RefreshToken) > 0 {
		plaintext, err := repository.Decrypt(oauth.RefreshToken, key)

		if err != nil {
			return err
		}

		oauth.RefreshToken = plaintext
	}

	return nil
}

// GCPIntegrationRepository uses gorm.DB for querying the database
type GCPIntegrationRepository struct {
	db  *gorm.DB
	key *[32]byte
}

// NewGCPIntegrationRepository returns a GCPIntegrationRepository which uses
// gorm.DB for querying the database. It accepts an encryption key to encrypt
// sensitive data
func NewGCPIntegrationRepository(
	db *gorm.DB,
	key *[32]byte,
) repository.GCPIntegrationRepository {
	return &GCPIntegrationRepository{db, key}
}

// CreateGCPIntegration creates a new gcp auth mechanism
func (repo *GCPIntegrationRepository) CreateGCPIntegration(
	am *ints.GCPIntegration,
) (*ints.GCPIntegration, error) {
	err := repo.EncryptGCPIntegrationData(am, repo.key)

	if err != nil {
		return nil, err
	}

	project := &models.Project{}

	if err := repo.db.Where("id = ?", am.ProjectID).First(&project).Error; err != nil {
		return nil, err
	}

	assoc := repo.db.Model(&project).Association("GCPIntegrations")

	if assoc.Error != nil {
		return nil, assoc.Error
	}

	if err := assoc.Append(am); err != nil {
		return nil, err
	}

	return am, nil
}

// ReadGCPIntegration finds a gcp auth mechanism by id
func (repo *GCPIntegrationRepository) ReadGCPIntegration(
	id uint,
) (*ints.GCPIntegration, error) {
	gcp := &ints.GCPIntegration{}

	if err := repo.db.Where("id = ?", id).First(&gcp).Error; err != nil {
		return nil, err
	}

	err := repo.DecryptGCPIntegrationData(gcp, repo.key)

	if err != nil {
		return nil, err
	}

	return gcp, nil
}

// ListGCPIntegrationsByProjectID finds all gcp auth mechanisms
// for a given project id
func (repo *GCPIntegrationRepository) ListGCPIntegrationsByProjectID(
	projectID uint,
) ([]*ints.GCPIntegration, error) {
	gcps := []*ints.GCPIntegration{}

	if err := repo.db.Where("project_id = ?", projectID).Find(&gcps).Error; err != nil {
		return nil, err
	}

	for _, gcp := range gcps {
		repo.DecryptGCPIntegrationData(gcp, repo.key)
	}

	return gcps, nil
}

// EncryptGCPIntegrationData will encrypt the gcp integration data before
// writing to the DB
func (repo *GCPIntegrationRepository) EncryptGCPIntegrationData(
	gcp *ints.GCPIntegration,
	key *[32]byte,
) error {
	if len(gcp.GCPKeyData) > 0 {
		cipherData, err := repository.Encrypt(gcp.GCPKeyData, key)

		if err != nil {
			return err
		}

		gcp.GCPKeyData = cipherData
	}

	return nil
}

// DecryptGCPIntegrationData will decrypt the gcp integration data before
// returning it from the DB
func (repo *GCPIntegrationRepository) DecryptGCPIntegrationData(
	gcp *ints.GCPIntegration,
	key *[32]byte,
) error {
	if len(gcp.GCPKeyData) > 0 {
		plaintext, err := repository.Decrypt(gcp.GCPKeyData, key)

		if err != nil {
			return err
		}

		gcp.GCPKeyData = plaintext
	}

	return nil
}

// AWSIntegrationRepository uses gorm.DB for querying the database
type AWSIntegrationRepository struct {
	db  *gorm.DB
	key *[32]byte
}

// NewAWSIntegrationRepository returns a AWSIntegrationRepository which uses
// gorm.DB for querying the database. It accepts an encryption key to encrypt
// sensitive data
func NewAWSIntegrationRepository(
	db *gorm.DB,
	key *[32]byte,
) repository.AWSIntegrationRepository {
	return &AWSIntegrationRepository{db, key}
}

// CreateAWSIntegration creates a new aws auth mechanism
func (repo *AWSIntegrationRepository) CreateAWSIntegration(
	am *ints.AWSIntegration,
) (*ints.AWSIntegration, error) {
	err := repo.EncryptAWSIntegrationData(am, repo.key)

	if err != nil {
		return nil, err
	}

	project := &models.Project{}

	if err := repo.db.Where("id = ?", am.ProjectID).First(&project).Error; err != nil {
		return nil, err
	}

	assoc := repo.db.Model(&project).Association("AWSIntegrations")

	if assoc.Error != nil {
		return nil, assoc.Error
	}

	if err := assoc.Append(am); err != nil {
		return nil, err
	}

	return am, nil
}

// UpdateCluster modifies an existing Cluster in the database
func (repo *AWSIntegrationRepository) OverwriteAWSIntegration(
	am *ints.AWSIntegration,
) (*ints.AWSIntegration, error) {
	err := repo.EncryptAWSIntegrationData(am, repo.key)

	if err != nil {
		return nil, err
	}

	if err := repo.db.Save(am).Error; err != nil {
		return nil, err
	}

	return am, nil
}

// ReadAWSIntegration finds a aws auth mechanism by id
func (repo *AWSIntegrationRepository) ReadAWSIntegration(
	id uint,
) (*ints.AWSIntegration, error) {
	aws := &ints.AWSIntegration{}

	if err := repo.db.Where("id = ?", id).First(&aws).Error; err != nil {
		return nil, err
	}

	err := repo.DecryptAWSIntegrationData(aws, repo.key)

	if err != nil {
		return nil, err
	}

	return aws, nil
}

// ListAWSIntegrationsByProjectID finds all aws auth mechanisms
// for a given project id
func (repo *AWSIntegrationRepository) ListAWSIntegrationsByProjectID(
	projectID uint,
) ([]*ints.AWSIntegration, error) {
	awss := []*ints.AWSIntegration{}

	if err := repo.db.Where("project_id = ?", projectID).Find(&awss).Error; err != nil {
		return nil, err
	}

	for _, aws := range awss {
		repo.DecryptAWSIntegrationData(aws, repo.key)
	}

	return awss, nil
}

// EncryptAWSIntegrationData will encrypt the aws integration data before
// writing to the DB
func (repo *AWSIntegrationRepository) EncryptAWSIntegrationData(
	aws *ints.AWSIntegration,
	key *[32]byte,
) error {
	if len(aws.AWSClusterID) > 0 {
		cipherData, err := repository.Encrypt(aws.AWSClusterID, key)

		if err != nil {
			return err
		}

		aws.AWSClusterID = cipherData
	}

	if len(aws.AWSAccessKeyID) > 0 {
		cipherData, err := repository.Encrypt(aws.AWSAccessKeyID, key)

		if err != nil {
			return err
		}

		aws.AWSAccessKeyID = cipherData
	}

	if len(aws.AWSSecretAccessKey) > 0 {
		cipherData, err := repository.Encrypt(aws.AWSSecretAccessKey, key)

		if err != nil {
			return err
		}

		aws.AWSSecretAccessKey = cipherData
	}

	if len(aws.AWSSessionToken) > 0 {
		cipherData, err := repository.Encrypt(aws.AWSSessionToken, key)

		if err != nil {
			return err
		}

		aws.AWSSessionToken = cipherData
	}

	return nil
}

// DecryptAWSIntegrationData will decrypt the aws integration data before
// returning it from the DB
func (repo *AWSIntegrationRepository) DecryptAWSIntegrationData(
	aws *ints.AWSIntegration,
	key *[32]byte,
) error {
	if len(aws.AWSClusterID) > 0 {
		plaintext, err := repository.Decrypt(aws.AWSClusterID, key)

		if err != nil {
			return err
		}

		aws.AWSClusterID = plaintext
	}

	if len(aws.AWSAccessKeyID) > 0 {
		plaintext, err := repository.Decrypt(aws.AWSAccessKeyID, key)

		if err != nil {
			return err
		}

		aws.AWSAccessKeyID = plaintext
	}

	if len(aws.AWSSecretAccessKey) > 0 {
		plaintext, err := repository.Decrypt(aws.AWSSecretAccessKey, key)

		if err != nil {
			return err
		}

		aws.AWSSecretAccessKey = plaintext
	}

	if len(aws.AWSSessionToken) > 0 {
		plaintext, err := repository.Decrypt(aws.AWSSessionToken, key)

		if err != nil {
			return err
		}

		aws.AWSSessionToken = plaintext
	}

	return nil
}

// GithubAppInstallationRepository implements repository.GithubAppInstallationRepository
type GithubAppInstallationRepository struct {
	db *gorm.DB
}

func NewGithubAppInstallationRepository(db *gorm.DB) repository.GithubAppInstallationRepository {
	return &GithubAppInstallationRepository{db}
}

func (repo *GithubAppInstallationRepository) CreateGithubAppInstallation(am *ints.GithubAppInstallation) (*ints.GithubAppInstallation, error) {
	if err := repo.db.Create(am).Error; err != nil {
		return nil, err
	}
	return am, nil
}

func (repo *GithubAppInstallationRepository) ReadGithubAppInstallation(id uint) (*ints.GithubAppInstallation, error) {
	ret := &ints.GithubAppInstallation{}

	if err := repo.db.Where("id = ?", id).First(&ret).Error; err != nil {
		return nil, err
	}

	return ret, nil
}

func (repo *GithubAppInstallationRepository) ReadGithubAppInstallationByAccountID(accountID int64) (*ints.GithubAppInstallation, error) {

	ret := &ints.GithubAppInstallation{}

	if err := repo.db.Where("account_id = ?", accountID).First(&ret).Error; err != nil {
		return nil, err
	}

	return ret, nil
}
