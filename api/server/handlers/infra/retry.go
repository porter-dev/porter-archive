package infra

import (
	"fmt"
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/handlers/provision"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/kubernetes/provisioner"
	"github.com/porter-dev/porter/internal/kubernetes/provisioner/aws/ecr"
	"github.com/porter-dev/porter/internal/kubernetes/provisioner/aws/eks"
	"github.com/porter-dev/porter/internal/kubernetes/provisioner/do/docr"
	"github.com/porter-dev/porter/internal/kubernetes/provisioner/do/doks"
	"github.com/porter-dev/porter/internal/kubernetes/provisioner/gcp/gcr"
	"github.com/porter-dev/porter/internal/kubernetes/provisioner/gcp/gke"
	"github.com/porter-dev/porter/internal/models"
	"gorm.io/gorm"
)

type InfraRetryHandler struct {
	handlers.PorterHandlerWriter
}

func NewInfraRetryHandler(config *config.Config, writer shared.ResultWriter) *InfraRetryHandler {
	return &InfraRetryHandler{
		PorterHandlerWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
	}
}

func (c *InfraRetryHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	infraModel, _ := r.Context().Value(types.InfraScope).(*models.Infra)

	if infraModel.Status != types.StatusError {
		c.HandleAPIError(w, r, apierrors.NewErrForbidden(
			fmt.Errorf("only errored infras maybe retried")))
		return
	}

	opts, err := c.getProvisioningOpts(infraModel)
	if err != nil {
		c.HandleAPIError(w, r, err)
		return
	}

	opts.OperationKind = provisioner.Apply

	provisionerErr := c.Config().ProvisionerAgent.Provision(opts)
	if provisionerErr != nil {
		infraModel.Status = types.StatusError
		c.Repo().Infra().UpdateInfra(infraModel)
		c.HandleAPIError(w, r, apierrors.NewErrInternal(provisionerErr))
		return
	}

	infraModel.Status = types.StatusCreating
	infraModel, _ = c.Repo().Infra().UpdateInfra(infraModel)

	c.WriteResult(w, r, infraModel.ToInfraType())
}

func (c *InfraRetryHandler) getProvisioningOpts(infraModel *models.Infra) (*provisioner.ProvisionOpts, apierrors.RequestError) {
	var vaultToken string
	var opts *provisioner.ProvisionOpts

	infra := infraModel.ToInfraType()

	switch infra.Kind {
	// ==================== Infrastructure Google Cloud ======================
	case types.InfraGKE, types.InfraGCR:
		integration, err := c.Repo().GCPIntegration().ReadGCPIntegration(infra.ProjectID, infra.GCPIntegrationID)
		if err != nil {
			return nil, c._qualifyGormError(err)
		}

		opts, err = c.getOptions(infraModel)
		if err != nil {
			return nil, apierrors.NewErrInternal(err)
		}

		if c.Config().CredentialBackend != nil {
			vaultToken, err = c.Config().CredentialBackend.CreateGCPToken(integration)
			if err != nil {
				return nil, apierrors.NewErrInternal(err)
			}
		}

		if infra.Kind == types.InfraGKE {
			opts.GKE = &gke.Conf{
				GCPProjectID: integration.GCPProjectID,
				GCPRegion:    integration.GCPRegion,
				ClusterName:  infra.LastApplied["gke_name"],
			}
		} else {
			opts.GCR = &gcr.Conf{
				GCPProjectID: integration.GCPProjectID,
			}
		}

	// ========================== Infrastructure AWS ============================
	case types.InfraEKS, types.InfraECR:
		integration, err := c.Repo().AWSIntegration().ReadAWSIntegration(infra.ProjectID, infra.AWSIntegrationID)
		if err != nil {
			return nil, c._qualifyGormError(err)
		}

		opts, err = c.getOptions(infraModel)
		if err != nil {
			return nil, apierrors.NewErrInternal(err)
		}

		if c.Config().CredentialBackend != nil {
			vaultToken, err = c.Config().CredentialBackend.CreateAWSToken(integration)
			if err != nil {
				return nil, apierrors.NewErrInternal(err)
			}
		}

		if infra.Kind == types.InfraEKS {
			opts.EKS = &eks.Conf{
				AWSRegion:   integration.AWSRegion,
				ClusterName: infra.LastApplied["eks_name"],
				MachineType: infra.LastApplied["machine_type"],
				IssuerEmail: infra.LastApplied["issuer_email"],
			}
		} else {
			opts.ECR = &ecr.Conf{
				AWSRegion: integration.AWSRegion,
				ECRName:   infra.LastApplied["ecr_name"],
			}
		}

	// ========================== Infrastructure Digital Ocean ============================
	case types.InfraDOKS, types.InfraDOCR:
		integration, err := c.Repo().OAuthIntegration().ReadOAuthIntegration(infra.ProjectID, infra.DOIntegrationID)
		if err != nil {
			return nil, c._qualifyGormError(err)
		}

		opts, err = c.getOptions(infraModel)
		if err != nil {
			return nil, apierrors.NewErrInternal(err)
		}

		if c.Config().CredentialBackend != nil {
			vaultToken, err = c.Config().CredentialBackend.CreateOAuthToken(integration)
			if err != nil {
				return nil, apierrors.NewErrInternal(err)
			}
		}

		if infra.Kind == types.InfraDOKS {
			opts.DOKS = &doks.Conf{
				DORegion:        infra.LastApplied["do_region"],
				DOKSClusterName: infra.LastApplied["doks_name"],
				IssuerEmail:     infra.LastApplied["issuer_email"],
			}
		} else {
			opts.DOCR = &docr.Conf{
				DOCRName:             infra.LastApplied["docr_name"],
				DOCRSubscriptionTier: infra.LastApplied["docr_subscription_tier"],
			}
		}

	default:
		// infra == InfraTest
		panic("not implemented!")
	}

	opts.CredentialExchange.VaultToken = vaultToken
	opts.OperationKind = provisioner.Apply

	return opts, nil
}

func (c *InfraRetryHandler) _qualifyGormError(err error) apierrors.RequestError {
	if err == gorm.ErrRecordNotFound {
		return apierrors.NewErrForbidden(err)
	} else {
		return apierrors.NewErrInternal(err)
	}
}

func (c *InfraRetryHandler) getOptions(infraModel *models.Infra) (*provisioner.ProvisionOpts, error) {
	// get provisioner options
	opts, err := provision.GetSharedProvisionerOpts(c.Config(), infraModel)
	if err != nil {
		return nil, apierrors.NewErrInternal(err)
	}

	return opts, nil
}
