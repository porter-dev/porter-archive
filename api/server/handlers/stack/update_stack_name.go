package stack

import (
	"fmt"
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

type StackUpdateStackName struct {
	handlers.PorterHandlerReadWriter
}

func NewStackUpdateStackNameHandler(
	config *config.Config,
	reader shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *StackUpdateStackName {
	return &StackUpdateStackName{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, reader, writer),
	}
}

func (p *StackUpdateStackName) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	proj, _ := r.Context().Value(types.ProjectScope).(*models.Project)
	stack, _ := r.Context().Value(types.StackScope).(*models.Stack)

	req := &types.UpdateStackNameRequest{}

	if ok := p.DecodeAndValidate(w, r, req); !ok {
		return
	}

	if len(stack.Revisions) == 0 {
		p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(
			fmt.Errorf("no stack revisions exist"), http.StatusBadRequest,
		))
		return
	}

	stack, err := p.Repo().Stack().ReadStackByID(proj.ID, stack.ID)

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	// Update stack name
	stack.Name = req.Name

	newStack, err := p.Repo().Stack().UpdateStack(stack)

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	p.WriteResult(w, r, newStack)
}
