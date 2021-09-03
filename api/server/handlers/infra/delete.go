package infra

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/kubernetes"
	"github.com/porter-dev/porter/internal/kubernetes/provisioner"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
)

type InfraDeleteHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewInfraDeleteHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *InfraDeleteHandler {
	return &InfraDeleteHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (c *InfraDeleteHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	infra, _ := r.Context().Value(types.InfraScope).(*models.Infra)

	request := &types.DeleteInfraRequest{}

	if ok := c.DecodeAndValidate(w, r, request); !ok {
		return
	}

	infra.Status = types.StatusDestroying
	infra, err := c.Repo().Infra().UpdateInfra(infra)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	switch infra.Kind {
	case types.InfraECR:
		err = destroyECR(c.Repo(), c.Config(), infra, request.Name)
	case types.InfraEKS:
		err = destroyEKS(c.Repo(), c.Config(), infra, request.Name)
	case types.InfraDOCR:
		err = destroyDOCR(c.Repo(), c.Config(), infra, request.Name)
	case types.InfraDOKS:
		err = destroyDOKS(c.Repo(), c.Config(), infra, request.Name)
	case types.InfraGKE:
		err = destroyGKE(c.Repo(), c.Config(), infra, request.Name)
	}

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}
}

func destroyECR(repo repository.Repository, conf *config.Config, infra *models.Infra, name string) error {
	awsInt, err := repo.AWSIntegration().ReadAWSIntegration(infra.ProjectID, infra.AWSIntegrationID)

	if err != nil {
		return err
	}

	_, err = conf.ProvisionerAgent.ProvisionECR(
		&kubernetes.SharedProvisionOpts{
			ProjectID:           infra.ProjectID,
			Repo:                repo,
			Infra:               infra,
			Operation:           provisioner.Destroy,
			PGConf:              conf.DBConf,
			RedisConf:           conf.RedisConf,
			ProvImageTag:        conf.ServerConf.ProvisionerImageTag,
			ProvImagePullSecret: conf.ServerConf.ProvisionerImagePullSecret,
		},
		awsInt,
		name,
	)

	return err
}

func destroyEKS(repo repository.Repository, conf *config.Config, infra *models.Infra, name string) error {
	awsInt, err := repo.AWSIntegration().ReadAWSIntegration(infra.ProjectID, infra.AWSIntegrationID)

	if err != nil {
		return err
	}

	_, err = conf.ProvisionerAgent.ProvisionEKS(
		&kubernetes.SharedProvisionOpts{
			ProjectID:           infra.ProjectID,
			Repo:                repo,
			Infra:               infra,
			Operation:           provisioner.Destroy,
			PGConf:              conf.DBConf,
			RedisConf:           conf.RedisConf,
			ProvImageTag:        conf.ServerConf.ProvisionerImageTag,
			ProvImagePullSecret: conf.ServerConf.ProvisionerImagePullSecret,
		},
		awsInt,
		name,
		"",
	)

	return err
}

func destroyDOCR(repo repository.Repository, conf *config.Config, infra *models.Infra, name string) error {
	doInt, err := repo.OAuthIntegration().ReadOAuthIntegration(infra.ProjectID, infra.DOIntegrationID)

	if err != nil {
		return err
	}

	_, err = conf.ProvisionerAgent.ProvisionDOCR(
		&kubernetes.SharedProvisionOpts{
			ProjectID:           infra.ProjectID,
			Repo:                repo,
			Infra:               infra,
			Operation:           provisioner.Destroy,
			PGConf:              conf.DBConf,
			RedisConf:           conf.RedisConf,
			ProvImageTag:        conf.ServerConf.ProvisionerImageTag,
			ProvImagePullSecret: conf.ServerConf.ProvisionerImagePullSecret,
		},
		doInt,
		conf.DOConf,
		name,
		"",
	)

	return err
}

func destroyDOKS(repo repository.Repository, conf *config.Config, infra *models.Infra, name string) error {
	doInt, err := repo.OAuthIntegration().ReadOAuthIntegration(infra.ProjectID, infra.DOIntegrationID)

	if err != nil {
		return err
	}

	_, err = conf.ProvisionerAgent.ProvisionDOKS(
		&kubernetes.SharedProvisionOpts{
			ProjectID:           infra.ProjectID,
			Repo:                repo,
			Infra:               infra,
			Operation:           provisioner.Destroy,
			PGConf:              conf.DBConf,
			RedisConf:           conf.RedisConf,
			ProvImageTag:        conf.ServerConf.ProvisionerImageTag,
			ProvImagePullSecret: conf.ServerConf.ProvisionerImagePullSecret,
		},
		doInt,
		conf.DOConf,
		"",
		name,
	)

	return err
}

func destroyGKE(repo repository.Repository, conf *config.Config, infra *models.Infra, name string) error {
	gcpInt, err := repo.GCPIntegration().ReadGCPIntegration(infra.ProjectID, infra.GCPIntegrationID)

	if err != nil {
		return err
	}

	_, err = conf.ProvisionerAgent.ProvisionGKE(
		&kubernetes.SharedProvisionOpts{
			ProjectID:           infra.ProjectID,
			Repo:                repo,
			Infra:               infra,
			Operation:           provisioner.Destroy,
			PGConf:              conf.DBConf,
			RedisConf:           conf.RedisConf,
			ProvImageTag:        conf.ServerConf.ProvisionerImageTag,
			ProvImagePullSecret: conf.ServerConf.ProvisionerImagePullSecret,
		},
		gcpInt,
		name,
	)

	return err
}
