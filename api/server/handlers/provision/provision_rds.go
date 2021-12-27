package provision

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strconv"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/ee/integrations/httpbackend"
	"github.com/porter-dev/porter/internal/kubernetes/provisioner"
	"github.com/porter-dev/porter/internal/kubernetes/provisioner/aws/rds"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"gorm.io/gorm"
)

type ProvisionRDSHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewProvisionRDSHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *ProvisionRDSHandler {
	return &ProvisionRDSHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (c *ProvisionRDSHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	user, _ := r.Context().Value(types.UserScope).(*models.User)
	proj, _ := r.Context().Value(types.ProjectScope).(*models.Project)

	request := &types.CreateRDSInfraRequest{
		ProjectID: proj.ID,
	}

	if ok := c.DecodeAndValidate(w, r, request); !ok {
		return
	}

	// given a cluster_id, fetch the cluster detail to get the infra_id
	cluster, err := c.Repo().Cluster().ReadCluster(proj.ID, request.ClusterID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.HandleAPIError(w, r, apierrors.NewErrForbidden(err))
		} else {
			c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		}

		return
	}

	clusterInfra, err := c.Repo().Infra().ReadInfra(1, 25) // proj.ID, cluster.InfraID)
	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(
			fmt.Errorf("empty cluster infra, projectID: %d, infraID: %d", proj.ID, cluster.InfraID),
			http.StatusNotFound,
		))

		return
	}

	suffix, err := repository.GenerateRandomBytes(6)
	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	lastApplied, err := json.Marshal(request)
	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	dbInfra := &models.Infra{
		ProjectID:       proj.ID,
		Status:          types.StatusCreating,
		Suffix:          suffix,
		CreatedByUserID: user.ID,
		LastApplied:     lastApplied,
	}

	// get the tfstate from the HTTP backend using the infra ID

	client := httpbackend.NewClient(c.Config().ServerConf.ProvisionerBackendURL)

	// get the unique infra name and query from the TF HTTP backend
	current, err := client.GetCurrentState("gke-10-62-e4c0a5bcf33c") // clusterInfra.GetUniqueName()
	if err != nil && errors.Is(err, httpbackend.ErrNotFound) {
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(
			err,
			http.StatusNotFound,
		))

		return
	} else if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	var vpc, region string
	var opts *provisioner.ProvisionOpts
	vaultToken := ""

	switch clusterInfra.Kind {
	case types.InfraGKE:
		dbInfra.Kind = types.InfraRDS // this will change to Google Cloud SQL once supported
		dbInfra.GCPIntegrationID = clusterInfra.GCPIntegrationID

		integration, err := c.Repo().GCPIntegration().ReadGCPIntegration(clusterInfra.ProjectID, clusterInfra.GCPIntegrationID)
		if err != nil {
			if err == gorm.ErrRecordNotFound {
				c.HandleAPIError(w, r, apierrors.NewErrForbidden(err))
			} else {
				c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			}

			return
		}

		region = integration.GCPRegion

		if c.Config().CredentialBackend != nil {
			vaultToken, err = c.Config().CredentialBackend.CreateGCPToken(integration)
			if err != nil {
				c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			}
		}

		vpc, err = c.ExtractVPCFromGKETFState(current, "google_compute_network.vpc")
		if err != nil {
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(
				err,
				http.StatusInternalServerError,
			))

			return
		}

	case types.InfraEKS:
		dbInfra.Kind = types.InfraRDS
		dbInfra.AWSIntegrationID = clusterInfra.AWSIntegrationID

		integration, err := c.Repo().AWSIntegration().ReadAWSIntegration(clusterInfra.ProjectID, clusterInfra.AWSIntegrationID)
		if err != nil {
			if err == gorm.ErrRecordNotFound {
				c.HandleAPIError(w, r, apierrors.NewErrForbidden(err))
			} else {
				c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			}

			return
		}

		region = integration.AWSRegion

		if c.Config().CredentialBackend != nil {
			vaultToken, err = c.Config().CredentialBackend.CreateAWSToken(integration)
			if err != nil {
				c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			}
		}

		vpc, err = c.ExtractVPCFromEKSTFState(current, "aws_vpc.this")
		if err != nil {
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(
				err,
				http.StatusInternalServerError,
			))

			return
		}

	case types.InfraDOKS:
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(
			errors.New("not implemented"),
			http.StatusNotImplemented,
		))

		return
	}

	// handle write to the database
	infra, err := c.Repo().Infra().CreateInfra(dbInfra)
	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	opts, err = GetSharedProvisionerOpts(c.Config(), infra)
	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	opts.CredentialExchange.VaultToken = vaultToken

	opts.RDS = &rds.Conf{
		AWSRegion:       region, // TODO: get integration
		DBName:          request.DBName,
		MachineType:     request.MachineType,
		DBEngineVersion: request.DBEngineVersion,
		DBFamily:        request.DBFamily,

		// TODO: Implement mapping for db family - compatible engine versions
		DBMajorEngineVersion: "<TODO>",

		DBAllocatedStorage:    request.DBStorage,
		DBMaxAllocatedStorage: request.DBMaxStorage,
		DBStorageEncrypted:    strconv.FormatBool(request.DBEncryption),
		Username:              request.Username,
		Password:              request.Password,
		VPCID:                 vpc,
		IssuerEmail:           user.Email,
	}

	opts.OperationKind = provisioner.Apply

	err = c.Config().ProvisionerAgent.Provision(opts)
	if err != nil {
		infra.Status = types.StatusError
		infra, _ = c.Repo().Infra().UpdateInfra(infra)
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	c.WriteResult(w, r, infra.ToInfraType())

	// response := map[string]interface{}{
	// 	"request":  request,
	// 	"project":  proj,
	// 	"cluster":  cluster,
	// 	"infra":    infra,
	// 	"current":  current,
	// 	"vpc_name": vpcName,
	// 	"opts":     opts,
	// }

	// c.WriteResult(w, r, response)
}

func (c *ProvisionRDSHandler) ExtractVPCFromEKSTFState(tfState *httpbackend.TFState, resourceIdentifier string) (string, error) {
	for _, resource := range tfState.Resources {
		if resourceIdentifier == resource.Type+"."+resource.Name {
			return c._extractVPCFromResourceInstance(resource, "id")
		}
	}

	return "", errors.New("name not found for the requested resource name-type")
}

func (c *ProvisionRDSHandler) ExtractVPCFromGKETFState(tfState *httpbackend.TFState, resourceIdentifier string) (string, error) {
	for _, resource := range tfState.Resources {
		// fmt.Printf("%s.%s\n", resource.Type, resource.Name)

		if resourceIdentifier == resource.Type+"."+resource.Name {
			return c._extractVPCFromResourceInstance(resource, "name")
		}
	}

	return "", errors.New("name not found for the requested resource name-type")
}

func (c *ProvisionRDSHandler) _extractVPCFromResourceInstance(resource httpbackend.TFStateResource, attributeName string) (string, error) {
	for _, instance := range resource.Instances {
		vpc, ok := instance.Attributes[attributeName]
		if !ok {
			return "", errors.New("name not found for the requested resource name-type")
		}

		vpcName, ok := vpc.(string)
		if !ok {
			return "", errors.New("cannot cast returned value to string")
		}

		return vpcName, nil
	}

	return "", errors.New("name not found for the requested resource name-type")
}

func (c *ProvisionRDSHandler) _qualifyGormError(err error) apierrors.RequestError {
	if err == gorm.ErrRecordNotFound {
		return apierrors.NewErrForbidden(err)
	} else {
		return apierrors.NewErrInternal(err)
	}
}
