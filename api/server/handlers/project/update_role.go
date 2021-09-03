package project

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

type RoleUpdateHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewRoleUpdateHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *RoleUpdateHandler {
	return &RoleUpdateHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (p *RoleUpdateHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	proj, _ := r.Context().Value(types.ProjectScope).(*models.Project)

	request := &types.UpdateRoleRequest{}

	ok := p.DecodeAndValidate(w, r, request)

	if !ok {
		return
	}

	role, err := p.Repo().Project().ReadProjectRole(proj.ID, request.UserID)

	if err != nil {
		http.Error(w, http.StatusText(http.StatusForbidden), http.StatusForbidden)
		return
	}

	role.Kind = types.RoleKind(request.Kind)

	role, err = p.Repo().Project().UpdateProjectRole(proj.ID, role)

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	var res = types.UpdateRoleResponse{
		Role: role.ToRoleType(),
	}

	p.WriteResult(w, r, res)
}
