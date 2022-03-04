package api_token

import (
	"errors"
	"fmt"
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/auth/token"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
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

	req := &types.CreateAPIToken{}

	if ok := p.DecodeAndValidate(w, r, req); !ok {
		return
	}

	// look up the policy and make sure it exists
	policy, err := p.Repo().Policy().ReadPolicy(proj.ID, req.PolicyUID)

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(
				fmt.Errorf("policy not found in project"),
				http.StatusBadRequest,
			))
			return
		}

		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	uid, err := repository.GenerateRandomBytes(16)

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	secretKey, err := repository.GenerateRandomBytes(16)

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
		PolicyUID:       policy.UniqueID,
		PolicyName:      policy.Name,
		Name:            req.Name,
		SecretKey:       hashedToken,
	}

	apiToken, err = p.Repo().APIToken().CreateAPIToken(apiToken)

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	apiPolicy, err := policy.ToAPIPolicyType()

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
