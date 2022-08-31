package project

import (
	"errors"
	"fmt"
	"net/http"

	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/requestutils"
	"gorm.io/gorm"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

type DeleteCollaboratorHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewDeleteCollaboratorHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *DeleteCollaboratorHandler {
	return &DeleteCollaboratorHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (p *DeleteCollaboratorHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	proj, _ := r.Context().Value(types.ProjectScope).(*models.Project)

	userID, reqErr := requestutils.GetURLParamUint(r, "user_id")

	if reqErr != nil {
		p.HandleAPIError(w, r, reqErr)
		return
	}

	// check for valid user ID
	_, err := p.Repo().User().ReadUser(userID)

	if err != nil && errors.Is(err, gorm.ErrRecordNotFound) {
		p.HandleAPIError(w, r, apierrors.NewErrNotFound(fmt.Errorf("user not found")))
		return
	} else if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	userRoles, err := p.Repo().ProjectRole().ListAllRolesForUser(proj.ID, userID)

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	if len(userRoles) == 0 {
		p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(
			fmt.Errorf("user is not a collaborator in this project"), http.StatusBadRequest,
		))
		return
	}

	for _, role := range userRoles {
		userIDs := role.GetUserIDs()
		var newUserIDs []uint

		for _, id := range userIDs {
			if id != userID {
				newUserIDs = append(newUserIDs, id)
			}
		}

		err = p.Repo().ProjectRole().UpdateUsersInProjectRole(proj.ID, role.UniqueID, newUserIDs)

		if err != nil {
			p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}
	}
}
