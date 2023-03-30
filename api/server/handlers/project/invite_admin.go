package project

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/config/envloader"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

type ProjectInviteAdminHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewProjectInviteAdminHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *ProjectInviteAdminHandler {
	return &ProjectInviteAdminHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (p *ProjectInviteAdminHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// Only add admin user if config is set
	InstanceEnvConf, _ := envloader.FromEnv()
	adminUserId := InstanceEnvConf.ServerConf.AdminUserId
	if adminUserId == 0 {
		return
	}

	request := &types.ProjectInviteAdminRequest{}
	ok := p.DecodeAndValidate(w, r, request)
	if !ok {
		return
	}

	// Read the user and project from context
	proj, _ := r.Context().Value(types.ProjectScope).(*models.Project)

	// Create role for admin if it doesn't exist
	projectRepo := p.Repo().Project()
	role, _ := projectRepo.ReadProjectRole(proj.ID, adminUserId)
	if role == nil {
		projectRepo.CreateProjectRole(proj, &models.Role{
			Role: types.Role{
				UserID:    adminUserId,
				ProjectID: proj.ID,
				Kind:      types.RoleAdmin,
			},
		})
	}

	p.WriteResult(w, r, proj.ToProjectType())
}
