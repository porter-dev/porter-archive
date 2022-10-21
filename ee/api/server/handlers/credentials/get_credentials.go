//go:build ee
// +build ee

package credentials

import (
	"fmt"
	"net/http"
	"strconv"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/ee/api/types"
	"github.com/porter-dev/porter/ee/integrations/vault"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository/credentials"
	"github.com/porter-dev/porter/internal/repository/gorm"
	"golang.org/x/crypto/bcrypt"
)

type CredentialsGetHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewCredentialsGetHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) http.Handler {
	return &CredentialsGetHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
	}
}

func (c *CredentialsGetHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// read the request to get the token id and hashed token
	req := &types.CredentialsExchangeRequest{}

	// populate the request from the headers
	req.CredExchangeToken = r.Header.Get("X-Porter-Token")
	tokID, err := strconv.ParseUint(r.Header.Get("X-Porter-Token-ID"), 10, 64)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrForbidden(err))
		return
	}

	req.CredExchangeID = uint(tokID)
	req.VaultToken = r.Header.Get("X-Vault-Token")

	// read the access token in the header, check against DB
	ceToken, err := c.Repo().CredentialsExchangeToken().ReadCredentialsExchangeToken(req.CredExchangeID)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrForbidden(err))
		return
	}

	// TODO: verify hashed token!!
	if valid, err := verifyToken(req.CredExchangeToken, ceToken); !valid {
		c.HandleAPIError(w, r, apierrors.NewErrForbidden(err))
		return
	}

	resp := &types.CredentialsExchangeResponse{}
	repo := c.Repo()

	// if the request contains a vault token, use that vault token to construct a new repository
	// that will query vault using the passed in token
	if req.VaultToken != "" {
		// read the vault token in the header, create new vault client with this token
		conf := c.Config().DBConf
		vaultClient := vault.NewClient(conf.VaultServerURL, req.VaultToken, conf.VaultPrefix)

		var key [32]byte

		for i, b := range []byte(conf.EncryptionKey) {
			key[i] = b
		}

		// use this vault client for the repo
		repo = gorm.NewRepository(c.Config().DB, &key, vaultClient)
	}

	if ceToken.DOCredentialID != 0 {
		doInt, err := repo.OAuthIntegration().ReadOAuthIntegration(ceToken.ProjectID, ceToken.DOCredentialID)

		if err != nil {
			c.HandleAPIError(w, r, apierrors.NewErrForbidden(err))
			return
		}

		resp.DO = &credentials.OAuthCredential{
			ClientID:     doInt.ClientID,
			AccessToken:  doInt.AccessToken,
			RefreshToken: doInt.RefreshToken,
		}
	} else if ceToken.GCPCredentialID != 0 {
		gcpInt, err := repo.GCPIntegration().ReadGCPIntegration(ceToken.ProjectID, ceToken.GCPCredentialID)

		if err != nil {
			c.HandleAPIError(w, r, apierrors.NewErrForbidden(err))
			return
		}

		resp.GCP = &credentials.GCPCredential{
			GCPKeyData: gcpInt.GCPKeyData,
		}
	} else if ceToken.AWSCredentialID != 0 {
		awsInt, err := repo.AWSIntegration().ReadAWSIntegration(ceToken.ProjectID, ceToken.AWSCredentialID)

		if err != nil {
			c.HandleAPIError(w, r, apierrors.NewErrForbidden(err))
			return
		}

		resp.AWS = &credentials.AWSCredential{
			AWSAccessKeyID:     awsInt.AWSAccessKeyID,
			AWSClusterID:       awsInt.AWSClusterID,
			AWSSecretAccessKey: awsInt.AWSSecretAccessKey,
			AWSSessionToken:    awsInt.AWSSessionToken,
			AWSAssumeRoleArn:   []byte(awsInt.AWSAssumeRoleArn),
		}
	}

	// return the decrypted credentials
	c.WriteResult(w, r, resp)
}

func verifyToken(reqToken string, ceToken *models.CredentialsExchangeToken) (bool, error) {
	// make sure the token is still valid and has not expired
	if ceToken.IsExpired() {
		return false, fmt.Errorf("token is expired")
	}

	// make sure the token is correct
	if err := bcrypt.CompareHashAndPassword([]byte(ceToken.Token), []byte(reqToken)); err != nil {
		return false, fmt.Errorf("verify token failed: %s", err)
	}

	return true, nil
}
