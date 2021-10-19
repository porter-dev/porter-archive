package infra

import (
	"encoding/json"
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/handlers/provision"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/analytics"
	"github.com/porter-dev/porter/internal/kubernetes/provisioner"
	"github.com/porter-dev/porter/internal/kubernetes/provisioner/aws/ecr"
	"github.com/porter-dev/porter/internal/models"
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

	if infra.Kind == types.InfraDOKS || infra.Kind == types.InfraGKE || infra.Kind == types.InfraEKS {
		c.Config().AnalyticsClient.Track(analytics.ClusterDestroyingStartTrack(
			&analytics.ClusterDestroyingStartTrackOpts{
				ClusterScopedTrackOpts: analytics.GetClusterScopedTrackOpts(infra.CreatedByUserID, infra.ProjectID, 0),
				ClusterType:            infra.Kind,
				InfraID:                infra.ID,
			},
		))
	}

	infra.Status = types.StatusDestroying
	infra, err := c.Repo().Infra().UpdateInfra(infra)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	switch infra.Kind {
	case types.InfraECR:
		err = destroyECR(c.Config(), infra)
		// case types.InfraEKS:
		// 	err = destroyEKS(c.Repo(), c.Config(), infra, request.Name)
		// case types.InfraDOCR:
		// 	err = destroyDOCR(c.Repo(), c.Config(), infra, request.Name)
		// case types.InfraDOKS:
		// 	err = destroyDOKS(c.Repo(), c.Config(), infra, request.Name)
		// case types.InfraGKE:
		// 	err = destroyGKE(c.Repo(), c.Config(), infra, request.Name)
	}

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}
}

func destroyECR(conf *config.Config, infra *models.Infra) error {
	lastAppliedECR := &types.CreateECRInfraRequest{}

	// parse infra last applied into ECR config
	if err := json.Unmarshal(infra.LastApplied, lastAppliedECR); err != nil {
		return err
	}

	awsInt, err := conf.Repo.AWSIntegration().ReadAWSIntegration(infra.ProjectID, infra.AWSIntegrationID)

	if err != nil {
		return err
	}

	opts, err := provision.GetSharedProvisionerOpts(conf, infra)

	vaultToken := ""

	if conf.CredentialBackend != nil {
		vaultToken, err = conf.CredentialBackend.CreateAWSToken(awsInt)

		if err != nil {
			return err
		}
	}

	opts.CredentialExchange.VaultToken = vaultToken
	opts.ECR = &ecr.Conf{
		ECRName: lastAppliedECR.ECRName,
	}
	opts.OperationKind = provisioner.Destroy

	err = conf.ProvisionerAgent.Provision(opts)

	return err
}

// func destroyEKS(repo repository.Repository, conf *config.Config, infra *models.Infra, name string) error {
// 	awsInt, err := repo.AWSIntegration().ReadAWSIntegration(infra.ProjectID, infra.AWSIntegrationID)

// 	if err != nil {
// 		return err
// 	}

// 	_, err = conf.ProvisionerAgent.ProvisionEKS(
// 		&kubernetes.SharedProvisionOpts{
// 			ProjectID:           infra.ProjectID,
// 			Repo:                repo,
// 			Infra:               infra,
// 			Operation:           provisioner.Destroy,
// 			PGConf:              conf.DBConf,
// 			RedisConf:           conf.RedisConf,
// 			ProvImageTag:        conf.ServerConf.ProvisionerImageTag,
// 			ProvImagePullSecret: conf.ServerConf.ProvisionerImagePullSecret,
// 		},
// 		awsInt,
// 		name,
// 		"",
// 	)

// 	return err
// }

// func destroyDOCR(repo repository.Repository, conf *config.Config, infra *models.Infra, name string) error {
// 	doInt, err := repo.OAuthIntegration().ReadOAuthIntegration(infra.ProjectID, infra.DOIntegrationID)

// 	if err != nil {
// 		return err
// 	}

// 	_, err = conf.ProvisionerAgent.ProvisionDOCR(
// 		&kubernetes.SharedProvisionOpts{
// 			ProjectID:           infra.ProjectID,
// 			Repo:                repo,
// 			Infra:               infra,
// 			Operation:           provisioner.Destroy,
// 			PGConf:              conf.DBConf,
// 			RedisConf:           conf.RedisConf,
// 			ProvImageTag:        conf.ServerConf.ProvisionerImageTag,
// 			ProvImagePullSecret: conf.ServerConf.ProvisionerImagePullSecret,
// 		},
// 		doInt,
// 		conf.DOConf,
// 		name,
// 		"",
// 	)

// 	return err
// }

// func destroyDOKS(repo repository.Repository, conf *config.Config, infra *models.Infra, name string) error {
// 	doInt, err := repo.OAuthIntegration().ReadOAuthIntegration(infra.ProjectID, infra.DOIntegrationID)

// 	if err != nil {
// 		return err
// 	}

// 	_, err = conf.ProvisionerAgent.ProvisionDOKS(
// 		&kubernetes.SharedProvisionOpts{
// 			ProjectID:           infra.ProjectID,
// 			Repo:                repo,
// 			Infra:               infra,
// 			Operation:           provisioner.Destroy,
// 			PGConf:              conf.DBConf,
// 			RedisConf:           conf.RedisConf,
// 			ProvImageTag:        conf.ServerConf.ProvisionerImageTag,
// 			ProvImagePullSecret: conf.ServerConf.ProvisionerImagePullSecret,
// 		},
// 		doInt,
// 		conf.DOConf,
// 		"",
// 		name,
// 	)

// 	return err
// }

// func destroyGKE(repo repository.Repository, conf *config.Config, infra *models.Infra, name string) error {
// 	gcpInt, err := repo.GCPIntegration().ReadGCPIntegration(infra.ProjectID, infra.GCPIntegrationID)

// 	if err != nil {
// 		return err
// 	}

// 	_, err = conf.ProvisionerAgent.ProvisionGKE(
// 		&kubernetes.SharedProvisionOpts{
// 			ProjectID:           infra.ProjectID,
// 			Repo:                repo,
// 			Infra:               infra,
// 			Operation:           provisioner.Destroy,
// 			PGConf:              conf.DBConf,
// 			RedisConf:           conf.RedisConf,
// 			ProvImageTag:        conf.ServerConf.ProvisionerImageTag,
// 			ProvImagePullSecret: conf.ServerConf.ProvisionerImagePullSecret,
// 		},
// 		gcpInt,
// 		name,
// 	)

// 	return err
// }
