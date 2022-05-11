package api_token

import (
	"errors"
	"fmt"
	"net/http"

	"github.com/porter-dev/porter/api/server/authz/policy"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/requestutils"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"gorm.io/gorm"
)

type APITokenGetHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewAPITokenGetHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *APITokenGetHandler {
	return &APITokenGetHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (p *APITokenGetHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	proj, _ := r.Context().Value(types.ProjectScope).(*models.Project)

	if !proj.APITokensEnabled {
		p.HandleAPIError(w, r, apierrors.NewErrForbidden(fmt.Errorf("api token endpoints are not enabled for this project")))
		return
	}

	// get the token id from the request
	tokenID, reqErr := requestutils.GetURLParamString(r, types.URLParamTokenID)

	if reqErr != nil {
		p.HandleAPIError(w, r, reqErr)
		return
	}

	token, err := p.Repo().APIToken().ReadAPIToken(proj.ID, tokenID)

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(
				fmt.Errorf("token with id %s not found in project", tokenID),
				http.StatusNotFound,
			))
			return
		}

		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	apiPolicy, reqErr := policy.GetAPIPolicyFromUID(p.Repo().Policy(), proj.ID, token.PolicyUID)

	if reqErr != nil {
		p.HandleAPIError(w, r, reqErr)
		return
	}

	p.WriteResult(w, r, token.ToAPITokenType(apiPolicy.Policy, ""))
}
