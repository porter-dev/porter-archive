package provision

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/analytics"
	"github.com/porter-dev/porter/internal/kubernetes"
	"github.com/porter-dev/porter/internal/kubernetes/provisioner"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"gorm.io/gorm"
)

type ProvisionDOKSHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewProvisionDOKSHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *ProvisionDOKSHandler {
	return &ProvisionDOKSHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (c *ProvisionDOKSHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// read the user and project from context
	user, _ := r.Context().Value(types.UserScope).(*models.User)
	proj, _ := r.Context().Value(types.ProjectScope).(*models.Project)

	request := &types.CreateDOKSInfraRequest{}

	if ok := c.DecodeAndValidate(w, r, request); !ok {
		return
	}

	// get the AWS integration
	doInt, err := c.Repo().OAuthIntegration().ReadOAuthIntegration(proj.ID, request.DOIntegrationID)

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.HandleAPIError(w, r, apierrors.NewErrForbidden(err))
		} else {
			c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		}

		return
	}

	suffix, err := repository.GenerateRandomBytes(6)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	infra := &models.Infra{
		Kind:            types.InfraDOKS,
		ProjectID:       proj.ID,
		Suffix:          suffix,
		Status:          types.StatusCreating,
		DOIntegrationID: request.DOIntegrationID,
	}

	// handle write to the database
	infra, err = c.Repo().Infra().CreateInfra(infra)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	// launch provisioning pod
	_, err = c.Config().ProvisionerAgent.ProvisionDOKS(
		&kubernetes.SharedProvisionOpts{
			ProjectID:           proj.ID,
			Repo:                c.Repo(),
			Infra:               infra,
			Operation:           provisioner.Apply,
			PGConf:              c.Config().DBConf,
			RedisConf:           c.Config().RedisConf,
			ProvImageTag:        c.Config().ServerConf.ProvisionerImageTag,
			ProvImagePullSecret: c.Config().ServerConf.ProvisionerImagePullSecret,
		},
		doInt,
		c.Config().DOConf,
		request.DORegion,
		request.DOKSName,
	)

	if err != nil {
		infra.Status = types.StatusError
		infra, _ = c.Repo().Infra().UpdateInfra(infra)
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	c.Config().AnalyticsClient.Track(analytics.ClusterProvisioningStartTrack(
		&analytics.ClusterProvisioningStartTrackOpts{
			ProjectScopedTrackOpts: analytics.GetProjectScopedTrackOpts(user.ID, proj.ID),
			ClusterType:            types.InfraDOKS,
			InfraID:                infra.ID,
		},
	))

	c.WriteResult(w, r, infra.ToInfraType())
}
