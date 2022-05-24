package api_token

import (
	"fmt"
	"net/http"
	"time"

	"github.com/porter-dev/porter/api/server/authz/policy"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/auth/token"
	"github.com/porter-dev/porter/internal/encryption"
	"github.com/porter-dev/porter/internal/models"
	"golang.org/x/crypto/bcrypt"
)

type APITokenCreateHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewAPITokenCreateHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *APITokenCreateHandler {
	return &APITokenCreateHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (p *APITokenCreateHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	user, _ := r.Context().Value(types.UserScope).(*models.User)
	proj, _ := r.Context().Value(types.ProjectScope).(*models.Project)

	if !proj.APITokensEnabled {
		p.HandleAPIError(w, r, apierrors.NewErrForbidden(fmt.Errorf("api token endpoints are not enabled for this project")))
		return
	}

	req := &types.CreateAPIToken{}

	if ok := p.DecodeAndValidate(w, r, req); !ok {
		return
	}

	// if the expiry time is not set, set the expiry to 1 year
	if req.ExpiresAt.IsZero() {
		req.ExpiresAt = time.Now().Add(time.Hour * 24 * 365)
	}

	apiPolicy, reqErr := policy.GetAPIPolicyFromUID(p.Repo().Policy(), proj.ID, req.PolicyUID)

	if reqErr != nil {
		p.HandleAPIError(w, r, reqErr)
		return
	}

	uid, err := encryption.GenerateRandomBytes(16)

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	secretKey, err := encryption.GenerateRandomBytes(16)

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	// hash the secret key for storage in the db
	hashedToken, err := bcrypt.GenerateFromPassword([]byte(secretKey), 8)

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	apiToken := &models.APIToken{
		UniqueID:        uid,
		ProjectID:       proj.ID,
		CreatedByUserID: user.ID,
		Expiry:          &req.ExpiresAt,
		Revoked:         false,
		PolicyUID:       apiPolicy.UID,
		PolicyName:      apiPolicy.Name,
		Name:            req.Name,
		SecretKey:       hashedToken,
	}

	apiToken, err = p.Repo().APIToken().CreateAPIToken(apiToken)

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	// generate porter jwt token
	jwt, err := token.GetStoredTokenForAPI(user.ID, proj.ID, apiToken.UniqueID, secretKey)

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	encoded, err := jwt.EncodeToken(p.Config().TokenConf)

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	p.WriteResult(w, r, apiToken.ToAPITokenType(apiPolicy.Policy, encoded))
}
