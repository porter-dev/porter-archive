package policy

import (
	"errors"
	"fmt"
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/requestutils"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"gorm.io/gorm"
)

type PolicyGetHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewPolicyGetHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *PolicyGetHandler {
	return &PolicyGetHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (p *PolicyGetHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	proj, _ := r.Context().Value(types.ProjectScope).(*models.Project)

	// get the token id from the request
	policyID, reqErr := requestutils.GetURLParamString(r, types.URLParamPolicyID)

	if reqErr != nil {
		p.HandleAPIError(w, r, reqErr)
		return
	}

	policy, err := p.Repo().Policy().ReadPolicy(proj.ID, policyID)

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(
				fmt.Errorf("policy with id %s not found in project", policyID),
				http.StatusNotFound,
			))
			return
		}

		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	res, err := policy.ToAPIPolicyType()

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	p.WriteResult(w, r, res)
}
