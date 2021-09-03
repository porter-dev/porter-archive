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

type RoleDeleteHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewRoleDeleteHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *RoleDeleteHandler {
	return &RoleDeleteHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (p *RoleDeleteHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	proj, _ := r.Context().Value(types.ProjectScope).(*models.Project)

	request := &types.DeleteRoleRequest{}

	ok := p.DecodeAndValidate(w, r, request)

	if !ok {
		return
	}

	role, err := p.Repo().Project().ReadProjectRole(proj.ID, request.UserID)

	if err != nil {
		http.Error(w, http.StatusText(http.StatusForbidden), http.StatusForbidden)
		return
	}

	role, err = p.Repo().Project().DeleteProjectRole(proj.ID, request.UserID)

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
	}

	res := &types.DeleteRoleResponse{
		Role: role.ToRoleType(),
	}

	p.WriteResult(w, r, res)
}
