package infra

import (
	"context"
	"errors"
	"fmt"
	"net/http"

	"github.com/mitchellh/mapstructure"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/encryption"
	"github.com/porter-dev/porter/internal/models"
	"gorm.io/gorm"

	ptypes "github.com/porter-dev/porter/provisioner/types"
)

type InfraCreateHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewInfraCreateHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *InfraCreateHandler {
	return &InfraCreateHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (c *InfraCreateHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	user, _ := r.Context().Value(types.UserScope).(*models.User)
	proj, _ := r.Context().Value(types.ProjectScope).(*models.Project)

	req := &types.CreateInfraRequest{}

	if ok := c.DecodeAndValidate(w, r, req); !ok {
		return
	}

	var cluster *models.Cluster
	var err error

	if req.ClusterID != 0 {
		cluster, err = c.Repo().Cluster().ReadCluster(proj.ID, req.ClusterID)

		if err != nil {
			if err == gorm.ErrRecordNotFound {
				c.HandleAPIError(w, r, apierrors.NewErrForbidden(
					fmt.Errorf("cluster with id %d not found in project %d", req.ClusterID, proj.ID),
				))
			} else {
				c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			}

			return
		}
	}

	suffix, err := encryption.GenerateRandomBytes(6)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	sourceLink, sourceVersion := getSourceLinkAndVersion(types.InfraKind(req.Kind))

	// create the infra object
	infra := &models.Infra{
		Kind:            types.InfraKind(req.Kind),
		APIVersion:      "v2",
		ProjectID:       proj.ID,
		Suffix:          suffix,
		Status:          types.StatusCreating,
		CreatedByUserID: user.ID,
		SourceLink:      sourceLink,
		SourceVersion:   sourceVersion,
		// If the cluster ID was passed in, we store the parent cluster ID in the infra
		// so it can be referenced later
		ParentClusterID: req.ClusterID,
	}

	// verify the credentials
	err = checkInfraCredentials(c.Config(), proj, infra, req.InfraCredentials)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrForbidden(err))
		return
	}

	// call apply on the provisioner service
	vals := req.Values

	// if this is cluster-scoped and the kind is RDS, run the postrenderer
	if req.ClusterID != 0 && req.Kind == "rds" {
		var ok bool

		pr := &InfraRDSPostrenderer{
			config: c.Config(),
		}

		if vals, ok = pr.Run(w, r, &Opts{
			Cluster: cluster,
			Values:  req.Values,
		}); !ok {
			return
		}
	}

	// handle write to the database
	infra, err = c.Repo().Infra().CreateInfra(infra)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	resp, err := c.Config().ProvisionerClient.Apply(context.Background(), proj.ID, infra.ID, &ptypes.ApplyBaseRequest{
		Kind:          req.Kind,
		Values:        vals,
		OperationKind: "create",
	})

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	c.WriteResult(w, r, resp)
}

func checkInfraCredentials(config *config.Config, proj *models.Project, infra *models.Infra, req *types.InfraCredentials) error {
	if req == nil {
		return nil
	}

	if req.DOIntegrationID != 0 {
		_, err := config.Repo.OAuthIntegration().ReadOAuthIntegration(proj.ID, req.DOIntegrationID)

		if err != nil {
			return fmt.Errorf("do integration id %d not found in project %d", req.DOIntegrationID, proj.ID)
		}

		infra.DOIntegrationID = req.DOIntegrationID
		infra.AWSIntegrationID = 0
		infra.GCPIntegrationID = 0
		infra.AzureIntegrationID = 0
	} else if req.AWSIntegrationID != 0 {
		_, err := config.Repo.AWSIntegration().ReadAWSIntegration(proj.ID, req.AWSIntegrationID)

		if err != nil {
			return fmt.Errorf("aws integration id %d not found in project %d", req.AWSIntegrationID, proj.ID)
		}

		infra.DOIntegrationID = 0
		infra.AWSIntegrationID = req.AWSIntegrationID
		infra.GCPIntegrationID = 0
		infra.AzureIntegrationID = 0
	} else if req.GCPIntegrationID != 0 {
		_, err := config.Repo.GCPIntegration().ReadGCPIntegration(proj.ID, req.GCPIntegrationID)

		if err != nil {
			return fmt.Errorf("gcp integration id %d not found in project %d", req.GCPIntegrationID, proj.ID)
		}

		infra.DOIntegrationID = 0
		infra.AWSIntegrationID = 0
		infra.GCPIntegrationID = req.GCPIntegrationID
		infra.AzureIntegrationID = 0
	} else if req.AzureIntegrationID != 0 {
		_, err := config.Repo.AzureIntegration().ReadAzureIntegration(proj.ID, req.AzureIntegrationID)

		if err != nil {
			return fmt.Errorf("azure integration id %d not found in project %d", req.AzureIntegrationID, proj.ID)
		}

		infra.DOIntegrationID = 0
		infra.AWSIntegrationID = 0
		infra.GCPIntegrationID = 0
		infra.AzureIntegrationID = req.AzureIntegrationID
	}

	if infra.DOIntegrationID == 0 && infra.AWSIntegrationID == 0 && infra.GCPIntegrationID == 0 && infra.AzureIntegrationID == 0 {
		return fmt.Errorf("at least one integration id must be set")
	}

	return nil
}

// getSourceLinkAndVersion returns the source link and version for the infrastructure. For now,
// this is hardcoded
func getSourceLinkAndVersion(kind types.InfraKind) (string, string) {
	switch kind {
	case types.InfraECR:
		return "porter/aws/ecr", "v0.1.0"
	case types.InfraEKS:
		return "porter/aws/eks", "v0.1.0"
	case types.InfraRDS:
		return "porter/aws/rds", "v0.1.0"
	case types.InfraS3:
		return "porter/aws/s3", "v0.1.0"
	case types.InfraGCR:
		return "porter/gcp/gcr", "v0.1.0"
	case types.InfraGKE:
		return "porter/gcp/gke", "v0.1.0"
	case types.InfraDOCR:
		return "porter/do/docr", "v0.1.0"
	case types.InfraDOKS:
		return "porter/do/doks", "v0.1.0"
	case types.InfraAKS:
		return "porter/azure/aks", "v0.1.0"
	case types.InfraACR:
		return "porter/azure/acr", "v0.1.0"
	}

	return "porter/test", "v0.1.0"
}

type InfraRDSPostrenderer struct {
	config *config.Config
}

type Opts struct {
	Cluster *models.Cluster
	Values  map[string]interface{}
}

func (i *InfraRDSPostrenderer) Run(w http.ResponseWriter, r *http.Request, opts *Opts) (map[string]interface{}, bool) {
	if opts.Cluster != nil {
		proj, _ := r.Context().Value(types.ProjectScope).(*models.Project)
		values := opts.Values

		// find the corresponding infra id
		clusterInfra, err := i.config.Repo.Infra().ReadInfra(proj.ID, opts.Cluster.InfraID)

		if err != nil {
			apierrors.HandleAPIError(i.config.Logger, i.config.Alerter, w, r, apierrors.NewErrForbidden(fmt.Errorf("could not get cluster infra: %v", err)), true)
			return nil, false
		}

		clusterInfraOperation, err := i.config.Repo.Infra().GetLatestOperation(clusterInfra)

		// get the raw state for the cluster
		rawState, err := i.config.ProvisionerClient.GetRawState(context.Background(), models.GetWorkspaceID(clusterInfra, clusterInfraOperation))

		if err != nil {
			apierrors.HandleAPIError(i.config.Logger, i.config.Alerter, w, r, apierrors.NewErrInternal(err), true)
			return nil, false
		}

		vpcID, subnetIDs, err := getVPCFromEKSTFState(rawState)

		if err != nil {
			return values, false
		}

		// if the length of the subnets is not 3, return an error
		if len(subnetIDs) < 3 {
			apierrors.HandleAPIError(i.config.Logger, i.config.Alerter, w, r, apierrors.NewErrInternal(fmt.Errorf("invalid number of subnet IDs in VPC configuration")), true)
			return nil, false
		}

		values["porter_cluster_vpc"] = vpcID
		values["porter_cluster_subnet_1"] = subnetIDs[0]
		values["porter_cluster_subnet_2"] = subnetIDs[1]
		values["porter_cluster_subnet_3"] = subnetIDs[2]

		return values, true
	}

	return opts.Values, true
}

type AWSVPCConfig struct {
	SubNetIDs []string `json:"subnet_ids" mapstructure:"subnet_ids"`
	VPCID     string   `json:"vpc_id" mapstructure:"vpc_id"`
}

func getVPCFromEKSTFState(tfState *ptypes.ParseableRawTFState) (string, []string, error) {
	for _, resource := range tfState.Resources {
		if "aws_eks_cluster.cluster" == resource.Type+"."+resource.Name {
			for _, instance := range resource.Instances {
				vpcConfig, ok := instance.Attributes["vpc_config"]
				if !ok {
					return "", []string{}, errors.New("name not found for the requested resource name-type")
				}

				awsVPCConfigIface, ok := vpcConfig.([]interface{})
				if !ok {
					fmt.Printf("%#v\n", vpcConfig)
					return "", []string{}, errors.New("cannot cast returned value to vpc config")
				}

				if len(awsVPCConfigIface) == 0 {
					return "", []string{}, errors.New("empty vpc config")
				}

				awsVPCConfigMap, ok := awsVPCConfigIface[0].(map[string]interface{})
				if !ok {
					return "", []string{}, errors.New("cannot cast returned value to vpc config map")
				}

				var awsVPCConfig AWSVPCConfig

				err := mapstructure.Decode(awsVPCConfigMap, &awsVPCConfig)
				if err != nil {
					return "", []string{}, errors.New("cannot cast returned value to vpc config")
				}

				return awsVPCConfig.VPCID, awsVPCConfig.SubNetIDs, nil
			}

			return "", []string{}, errors.New("name not found for the requested resource name-type")
		}
	}

	return "", []string{}, errors.New("name not found for the requested resource name-type")
}
