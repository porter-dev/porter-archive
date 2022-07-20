package state

import (
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"regexp"
	"strings"

	"github.com/aws/aws-sdk-go/service/ecr"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/analytics"
	"github.com/porter-dev/porter/internal/kubernetes"
	"github.com/porter-dev/porter/internal/kubernetes/envgroup"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/provisioner/integrations/redis_stream"
	"github.com/porter-dev/porter/provisioner/server/config"
	ptypes "github.com/porter-dev/porter/provisioner/types"
	"gorm.io/gorm"
)

type CreateResourceHandler struct {
	Config           *config.Config
	decoderValidator shared.RequestDecoderValidator
}

func NewCreateResourceHandler(
	config *config.Config,
) *CreateResourceHandler {
	return &CreateResourceHandler{
		Config:           config,
		decoderValidator: shared.NewDefaultRequestDecoderValidator(config.Logger, config.Alerter),
	}
}

func (c *CreateResourceHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// read the infra from the attached scope
	infra, _ := r.Context().Value(types.InfraScope).(*models.Infra)
	operation, _ := r.Context().Value(types.OperationScope).(*models.Operation)

	req := &ptypes.CreateResourceRequest{}

	if ok := c.decoderValidator.DecodeAndValidate(w, r, req); !ok {
		return
	}

	// update the operation to indicate completion
	operation.Status = "completed"

	operation, err := c.Config.Repo.Infra().UpdateOperation(operation)

	if err != nil {
		apierrors.HandleAPIError(c.Config.Logger, c.Config.Alerter, w, r, apierrors.NewErrInternal(err), true)
		return
	}

	// push to the operation stream
	err = redis_stream.SendOperationCompleted(c.Config.RedisClient, infra, operation)

	if err != nil {
		apierrors.HandleAPIError(c.Config.Logger, c.Config.Alerter, w, r, apierrors.NewErrInternal(err), true)
		return
	}

	// push to the global stream
	err = redis_stream.PushToGlobalStream(c.Config.RedisClient, infra, operation, "created")

	if err != nil {
		apierrors.HandleAPIError(c.Config.Logger, c.Config.Alerter, w, r, apierrors.NewErrInternal(err), true)
		return
	}

	// update the infra to indicate completion
	infra.Status = "created"

	infra, err = c.Config.Repo.Infra().UpdateInfra(infra)

	if err != nil {
		apierrors.HandleAPIError(c.Config.Logger, c.Config.Alerter, w, r, apierrors.NewErrInternal(err), true)
		return
	}

	// switch on the kind of resource and write the corresponding objects to the database
	switch req.Kind {
	case string(types.InfraEKS), string(types.InfraDOKS), string(types.InfraGKE), string(types.InfraAKS):
		var cluster *models.Cluster

		cluster, err = createCluster(c.Config, infra, operation, req.Output)

		if cluster != nil {
			c.Config.AnalyticsClient.Track(analytics.ClusterProvisioningSuccessTrack(
				&analytics.ClusterProvisioningSuccessTrackOpts{
					ClusterScopedTrackOpts: analytics.GetClusterScopedTrackOpts(0, infra.ProjectID, cluster.ID),
					ClusterType:            infra.Kind,
					InfraID:                infra.ID,
				},
			))
		}
	case string(types.InfraECR):
		_, err = createECRRegistry(c.Config, infra, operation, req.Output)
	case string(types.InfraRDS):
		_, err = createRDSDatabase(c.Config, infra, operation, req.Output)
	case string(types.InfraS3):
		err = createS3Bucket(c.Config, infra, operation, req.Output)
	case string(types.InfraDOCR):
		_, err = createDOCRRegistry(c.Config, infra, operation, req.Output)
	case string(types.InfraGCR):
		_, err = createGCRRegistry(c.Config, infra, operation, req.Output)
	case string(types.InfraACR):
		_, err = createACRRegistry(c.Config, infra, operation, req.Output)
	}

	if err != nil {
		apierrors.HandleAPIError(c.Config.Logger, c.Config.Alerter, w, r, apierrors.NewErrInternal(err), true)
		return
	}
}

func createECRRegistry(config *config.Config, infra *models.Infra, operation *models.Operation, output map[string]interface{}) (*models.Registry, error) {
	reg := &models.Registry{
		ProjectID:        infra.ProjectID,
		AWSIntegrationID: infra.AWSIntegrationID,
		InfraID:          infra.ID,
		Name:             output["name"].(string),
	}

	// parse raw data into ECR type
	awsInt, err := config.Repo.AWSIntegration().ReadAWSIntegration(reg.ProjectID, reg.AWSIntegrationID)

	if err != nil {
		return nil, err
	}

	sess, err := awsInt.GetSession()

	if err != nil {
		return nil, err
	}

	ecrSvc := ecr.New(sess)

	authOutput, err := ecrSvc.GetAuthorizationToken(&ecr.GetAuthorizationTokenInput{})

	if err != nil {
		return nil, err
	}

	reg.URL = *authOutput.AuthorizationData[0].ProxyEndpoint

	reg, err = config.Repo.Registry().CreateRegistry(reg)

	if err != nil {
		return nil, err
	}

	return reg, nil
}

func createRDSDatabase(config *config.Config, infra *models.Infra, operation *models.Operation, output map[string]interface{}) (*models.Database, error) {
	// check for infra id being 0 as a safeguard so that all non-provisioned
	// clusters are not matched by read
	if infra.ID == 0 {
		return nil, fmt.Errorf("infra id cannot be 0")
	}

	var database *models.Database
	var err error
	var isNotFound bool

	database, err = config.Repo.Database().ReadDatabaseByInfraID(infra.ProjectID, infra.ID)

	isNotFound = err != nil && errors.Is(err, gorm.ErrRecordNotFound)

	if isNotFound {
		database = &models.Database{
			ProjectID: infra.ProjectID,
			ClusterID: infra.ParentClusterID,
			InfraID:   infra.ID,
			Status:    "Running",
		}
	} else if err != nil {
		return nil, err
	}

	database.InstanceID = output["rds_instance_id"].(string)
	database.InstanceEndpoint = output["rds_connection_endpoint"].(string)
	database.InstanceName = output["rds_instance_name"].(string)

	if isNotFound {
		database, err = config.Repo.Database().CreateDatabase(database)
	} else {
		database, err = config.Repo.Database().UpdateDatabase(database)
	}

	infra.DatabaseID = database.ID
	infra, err = config.Repo.Infra().UpdateInfra(infra)

	if err != nil {
		return nil, err
	}
	lastApplied := make(map[string]interface{})

	err = json.Unmarshal(operation.LastApplied, &lastApplied)

	if err != nil {
		return nil, err
	}

	err = createRDSEnvGroup(config, infra, database, lastApplied)

	if err != nil {
		return nil, err
	}

	return database, nil
}

func createS3Bucket(config *config.Config, infra *models.Infra, operation *models.Operation, output map[string]interface{}) error {
	lastApplied := make(map[string]interface{})

	err := json.Unmarshal(operation.LastApplied, &lastApplied)

	if err != nil {
		return err
	}

	return createS3EnvGroup(config, infra, lastApplied, output)
}

func createCluster(config *config.Config, infra *models.Infra, operation *models.Operation, output map[string]interface{}) (*models.Cluster, error) {
	// check for infra id being 0 as a safeguard so that all non-provisioned
	// clusters are not matched by read
	if infra.ID == 0 {
		return nil, fmt.Errorf("infra id cannot be 0")
	}

	var cluster *models.Cluster
	var err error
	var isNotFound bool

	// look for cluster matching infra in database; if the cluster already exists, update the cluster but
	// don't add it again
	cluster, err = config.Repo.Cluster().ReadClusterByInfraID(infra.ProjectID, infra.ID)

	isNotFound = err != nil && errors.Is(err, gorm.ErrRecordNotFound)

	if isNotFound {
		cluster = getNewCluster(infra)
	} else if err != nil {
		return nil, err
	}

	caData, err := transformClusterCAData([]byte(output["cluster_ca_data"].(string)))

	if err != nil {
		return nil, err
	}

	// if cluster_token is output and infra is azure, update the azure integration
	if _, exists := output["cluster_token"]; exists && infra.AzureIntegrationID != 0 {
		azInt, err := config.Repo.AzureIntegration().ReadAzureIntegration(infra.ProjectID, infra.AzureIntegrationID)

		if err != nil {
			return nil, err
		}

		azInt.AKSPassword = []byte(output["cluster_token"].(string))

		azInt, err = config.Repo.AzureIntegration().OverwriteAzureIntegration(azInt)

		if err != nil {
			return nil, err
		}
	}

	// only update the cluster name if this is during creation - we don't want to overwrite the cluster name
	// which may have been manually set
	if isNotFound {
		cluster.Name = output["cluster_name"].(string)
	}

	cluster.Server = output["cluster_endpoint"].(string)
	cluster.CertificateAuthorityData = caData

	if isNotFound {
		cluster, err = config.Repo.Cluster().CreateCluster(cluster)
	} else {
		cluster, err = config.Repo.Cluster().UpdateCluster(cluster)
	}

	if err != nil {
		return nil, err
	}

	return cluster, nil
}

func getNewCluster(infra *models.Infra) *models.Cluster {
	res := &models.Cluster{
		ProjectID: infra.ProjectID,
		InfraID:   infra.ID,
	}

	switch infra.Kind {
	case types.InfraEKS:
		res.AuthMechanism = models.AWS
		res.AWSIntegrationID = infra.AWSIntegrationID
	case types.InfraGKE:
		res.AuthMechanism = models.GCP
		res.GCPIntegrationID = infra.GCPIntegrationID
	case types.InfraDOKS:
		res.AuthMechanism = models.DO
		res.DOIntegrationID = infra.DOIntegrationID
	case types.InfraAKS:
		res.AuthMechanism = models.Azure
		res.AzureIntegrationID = infra.AzureIntegrationID
	}

	return res
}

func transformClusterCAData(ca []byte) ([]byte, error) {
	re := regexp.MustCompile(`^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)?$`)

	// if it matches the base64 regex, decode it
	caData := string(ca)

	if re.MatchString(caData) {
		decoded, err := base64.StdEncoding.DecodeString(caData)

		if err != nil {
			return nil, err
		}

		return []byte(decoded), nil
	}

	// otherwise just return the CA
	return ca, nil
}

func createDOCRRegistry(config *config.Config, infra *models.Infra, operation *models.Operation, output map[string]interface{}) (*models.Registry, error) {
	reg := &models.Registry{
		ProjectID:       infra.ProjectID,
		DOIntegrationID: infra.DOIntegrationID,
		InfraID:         infra.ID,
		URL:             output["url"].(string),
		Name:            output["name"].(string),
	}

	return config.Repo.Registry().CreateRegistry(reg)
}

func createGCRRegistry(config *config.Config, infra *models.Infra, operation *models.Operation, output map[string]interface{}) (*models.Registry, error) {
	reg := &models.Registry{
		ProjectID:        infra.ProjectID,
		GCPIntegrationID: infra.GCPIntegrationID,
		InfraID:          infra.ID,
		URL:              output["url"].(string),
		Name:             "gcr-registry",
	}

	return config.Repo.Registry().CreateRegistry(reg)
}

func createACRRegistry(config *config.Config, infra *models.Infra, operation *models.Operation, output map[string]interface{}) (*models.Registry, error) {
	reg := &models.Registry{
		ProjectID:          infra.ProjectID,
		AzureIntegrationID: infra.AzureIntegrationID,
		InfraID:            infra.ID,
		URL:                output["url"].(string),
		Name:               output["name"].(string),
	}

	return config.Repo.Registry().CreateRegistry(reg)
}

func createRDSEnvGroup(config *config.Config, infra *models.Infra, database *models.Database, lastApplied map[string]interface{}) error {
	cluster, err := config.Repo.Cluster().ReadCluster(infra.ProjectID, infra.ParentClusterID)

	if err != nil {
		return err
	}

	ooc := &kubernetes.OutOfClusterConfig{
		Repo:              config.Repo,
		DigitalOceanOAuth: config.DOConf,
		Cluster:           cluster,
	}

	agent, err := kubernetes.GetAgentOutOfClusterConfig(ooc)

	if err != nil {
		return fmt.Errorf("failed to get agent: %s", err.Error())
	}

	// split the instance endpoint on the port
	port := "5432"
	host := database.InstanceEndpoint

	if strArr := strings.Split(database.InstanceEndpoint, ":"); len(strArr) == 2 {
		host = strArr[0]
		port = strArr[1]
	}

	_, err = envgroup.CreateEnvGroup(agent, types.ConfigMapInput{
		Name:      fmt.Sprintf("rds-credentials-%s", lastApplied["db_name"].(string)),
		Namespace: "default",
		Variables: map[string]string{},
		SecretVariables: map[string]string{
			"PGPORT":     port,
			"PGHOST":     host,
			"PGPASSWORD": lastApplied["db_passwd"].(string),
			"PGUSER":     lastApplied["db_user"].(string),
		},
	})

	if err != nil {
		return fmt.Errorf("failed to create RDS env group: %s", err.Error())
	}

	return nil
}

func deleteRDSEnvGroup(config *config.Config, infra *models.Infra, lastApplied map[string]interface{}) error {
	cluster, err := config.Repo.Cluster().ReadCluster(infra.ProjectID, infra.ParentClusterID)

	if err != nil {
		return err
	}

	ooc := &kubernetes.OutOfClusterConfig{
		Repo:              config.Repo,
		DigitalOceanOAuth: config.DOConf,
		Cluster:           cluster,
	}

	agent, err := kubernetes.GetAgentOutOfClusterConfig(ooc)

	if err != nil {
		return fmt.Errorf("failed to get agent: %s", err.Error())
	}

	err = envgroup.DeleteEnvGroup(agent, fmt.Sprintf("rds-credentials-%s", lastApplied["db_name"].(string)), "default")

	if err != nil {
		return fmt.Errorf("failed to create RDS env group: %s", err.Error())
	}

	return nil
}

func createS3EnvGroup(config *config.Config, infra *models.Infra, lastApplied map[string]interface{}, output map[string]interface{}) error {
	cluster, err := config.Repo.Cluster().ReadCluster(infra.ProjectID, infra.ParentClusterID)

	if err != nil {
		return err
	}

	ooc := &kubernetes.OutOfClusterConfig{
		Repo:              config.Repo,
		DigitalOceanOAuth: config.DOConf,
		Cluster:           cluster,
	}

	agent, err := kubernetes.GetAgentOutOfClusterConfig(ooc)

	if err != nil {
		return fmt.Errorf("failed to get agent: %s", err.Error())
	}

	// split the instance endpoint on the port
	_, err = envgroup.CreateEnvGroup(agent, types.ConfigMapInput{
		Name:      fmt.Sprintf("s3-credentials-%s", lastApplied["bucket_name"].(string)),
		Namespace: "default",
		Variables: map[string]string{},
		SecretVariables: map[string]string{
			"S3_AWS_ACCESS_KEY_ID": output["s3_aws_access_key_id"].(string),
			"S3_AWS_SECRET_KEY":    output["s3_aws_secret_key"].(string),
			"S3_BUCKET_NAME":       output["s3_bucket_name"].(string),
		},
	})

	if err != nil {
		return fmt.Errorf("failed to create S3 env group: %s", err.Error())
	}

	return nil
}

func deleteS3EnvGroup(config *config.Config, infra *models.Infra, lastApplied map[string]interface{}) error {
	cluster, err := config.Repo.Cluster().ReadCluster(infra.ProjectID, infra.ParentClusterID)

	if err != nil {
		return err
	}

	ooc := &kubernetes.OutOfClusterConfig{
		Repo:              config.Repo,
		DigitalOceanOAuth: config.DOConf,
		Cluster:           cluster,
	}

	agent, err := kubernetes.GetAgentOutOfClusterConfig(ooc)

	if err != nil {
		return fmt.Errorf("failed to get agent: %s", err.Error())
	}

	err = envgroup.DeleteEnvGroup(agent, fmt.Sprintf("s3-credentials-%s", lastApplied["bucket_name"].(string)), "default")

	if err != nil {
		return fmt.Errorf("failed to create RDS env group: %s", err.Error())
	}

	return nil
}
