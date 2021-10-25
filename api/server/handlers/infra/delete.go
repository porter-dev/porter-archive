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
	"github.com/porter-dev/porter/internal/kubernetes/provisioner/aws/eks"
	"github.com/porter-dev/porter/internal/kubernetes/provisioner/do/docr"
	"github.com/porter-dev/porter/internal/kubernetes/provisioner/do/doks"
	"github.com/porter-dev/porter/internal/kubernetes/provisioner/gcp/gke"
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
	case types.InfraEKS:
		err = destroyEKS(c.Config(), infra)
	case types.InfraDOCR:
		err = destroyDOCR(c.Config(), infra)
	case types.InfraDOKS:
		err = destroyDOKS(c.Config(), infra)
	case types.InfraGKE:
		err = destroyGKE(c.Config(), infra)
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
		AWSRegion: awsInt.AWSRegion,
		ECRName:   lastAppliedECR.ECRName,
	}

	opts.OperationKind = provisioner.Destroy

	err = conf.ProvisionerAgent.Provision(opts)

	return err
}

func destroyEKS(conf *config.Config, infra *models.Infra) error {
	lastAppliedEKS := &types.CreateEKSInfraRequest{}

	// parse infra last applied into EKS config
	if err := json.Unmarshal(infra.LastApplied, lastAppliedEKS); err != nil {
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

	opts.EKS = &eks.Conf{
		AWSRegion:   awsInt.AWSRegion,
		ClusterName: lastAppliedEKS.EKSName,
		MachineType: lastAppliedEKS.MachineType,
		IssuerEmail: lastAppliedEKS.IssuerEmail,
	}
	opts.OperationKind = provisioner.Destroy

	err = conf.ProvisionerAgent.Provision(opts)

	return err
}

func destroyDOCR(conf *config.Config, infra *models.Infra) error {
	lastAppliedDOCR := &types.CreateDOCRInfraRequest{}

	// parse infra last applied into DOCR config
	if err := json.Unmarshal(infra.LastApplied, lastAppliedDOCR); err != nil {
		return err
	}

	doInt, err := conf.Repo.OAuthIntegration().ReadOAuthIntegration(infra.ProjectID, infra.DOIntegrationID)

	if err != nil {
		return err
	}

	opts, err := provision.GetSharedProvisionerOpts(conf, infra)

	vaultToken := ""

	if conf.CredentialBackend != nil {
		vaultToken, err = conf.CredentialBackend.CreateOAuthToken(doInt)

		if err != nil {
			return err
		}
	}

	opts.CredentialExchange.VaultToken = vaultToken

	opts.DOCR = &docr.Conf{
		DOCRName:             lastAppliedDOCR.DOCRName,
		DOCRSubscriptionTier: lastAppliedDOCR.DOCRSubscriptionTier,
	}

	opts.OperationKind = provisioner.Destroy

	err = conf.ProvisionerAgent.Provision(opts)

	return err
}

func destroyDOKS(conf *config.Config, infra *models.Infra) error {
	lastAppliedDOKS := &types.CreateDOKSInfraRequest{}

	// parse infra last applied into DOKS config
	if err := json.Unmarshal(infra.LastApplied, lastAppliedDOKS); err != nil {
		return err
	}

	doInt, err := conf.Repo.OAuthIntegration().ReadOAuthIntegration(infra.ProjectID, infra.DOIntegrationID)

	if err != nil {
		return err
	}

	opts, err := provision.GetSharedProvisionerOpts(conf, infra)

	vaultToken := ""

	if conf.CredentialBackend != nil {
		vaultToken, err = conf.CredentialBackend.CreateOAuthToken(doInt)

		if err != nil {
			return err
		}
	}

	opts.CredentialExchange.VaultToken = vaultToken

	opts.DOKS = &doks.Conf{
		DORegion:        lastAppliedDOKS.DORegion,
		DOKSClusterName: lastAppliedDOKS.DOKSName,
		IssuerEmail:     lastAppliedDOKS.IssuerEmail,
	}

	opts.OperationKind = provisioner.Destroy

	err = conf.ProvisionerAgent.Provision(opts)

	return err
}

func destroyGKE(conf *config.Config, infra *models.Infra) error {
	lastAppliedGKE := &types.CreateGKEInfraRequest{}

	// parse infra last applied into DOKS config
	if err := json.Unmarshal(infra.LastApplied, lastAppliedGKE); err != nil {
		return err
	}

	gcpInt, err := conf.Repo.GCPIntegration().ReadGCPIntegration(infra.ProjectID, infra.GCPIntegrationID)

	if err != nil {
		return err
	}

	opts, err := provision.GetSharedProvisionerOpts(conf, infra)

	vaultToken := ""

	if conf.CredentialBackend != nil {
		vaultToken, err = conf.CredentialBackend.CreateGCPToken(gcpInt)

		if err != nil {
			return err
		}
	}

	opts.CredentialExchange.VaultToken = vaultToken
	opts.GKE = &gke.Conf{
		GCPProjectID: gcpInt.GCPProjectID,
		GCPRegion:    lastAppliedGKE.GCPRegion,
		ClusterName:  lastAppliedGKE.GKEName,
		IssuerEmail:  lastAppliedGKE.IssuerEmail,
	}

	opts.OperationKind = provisioner.Destroy

	err = conf.ProvisionerAgent.Provision(opts)

	return err
}
