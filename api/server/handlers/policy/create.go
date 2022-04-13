package policy

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/encryption"
	"github.com/porter-dev/porter/internal/models"
)

type PolicyCreateHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewPolicyCreateHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *PolicyCreateHandler {
	return &PolicyCreateHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (p *PolicyCreateHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	user, _ := r.Context().Value(types.UserScope).(*models.User)
	proj, _ := r.Context().Value(types.ProjectScope).(*models.Project)

	req := &types.CreatePolicy{}

	if ok := p.DecodeAndValidate(w, r, req); !ok {
		return
	}

	// policy can't be one of the preset policy names
	if name := strings.ToLower(req.Name); name == "admin" || name == "developer" || name == "viewer" {
		p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(
			fmt.Errorf("name cannot be one of the preset policy names"),
			http.StatusBadRequest,
		))

		return
	}

	uid, err := encryption.GenerateRandomBytes(16)

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	policyBytes, err := json.Marshal(req.Policy)

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	policy := &models.Policy{
		ProjectID:       proj.ID,
		UniqueID:        uid,
		CreatedByUserID: user.ID,
		Name:            req.Name,
		PolicyBytes:     policyBytes,
	}

	policy, err = p.Repo().Policy().CreatePolicy(policy)

	if err != nil {
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
