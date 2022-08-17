package policy

import (
	"bytes"
	"encoding/json"
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

type PolicyUpdateHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewPolicyUpdateHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *PolicyUpdateHandler {
	return &PolicyUpdateHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (p *PolicyUpdateHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	proj, _ := r.Context().Value(types.ProjectScope).(*models.Project)

	policyID, reqErr := requestutils.GetURLParamString(r, types.URLParamPolicyID)

	if reqErr != nil {
		p.HandleAPIError(w, r, reqErr)
		return
	}

	req := &types.UpdatePolicyRequest{}

	if ok := p.DecodeAndValidate(w, r, req); !ok {
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

	policyBytes, err := json.Marshal(req.Policy)

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	if !bytes.Equal(policyBytes, policy.PolicyBytes) {
		policy.PolicyBytes = policyBytes

		policy, err = p.Repo().Policy().UpdatePolicy(policy)

		if err != nil {
			p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}
	}

	res, err := policy.ToAPIPolicyType()

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	p.WriteResult(w, r, res)
}
