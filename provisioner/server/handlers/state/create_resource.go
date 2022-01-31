package state

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"regexp"
	"strings"

	"github.com/aws/aws-sdk-go/service/ecr"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/kubernetes"
	"github.com/porter-dev/porter/internal/kubernetes/envgroup"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/provisioner/server/config"
	ptypes "github.com/porter-dev/porter/provisioner/types"
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

	// update the infra to indicate completion
	infra.Status = "created"

	infra, err = c.Config.Repo.Infra().UpdateInfra(infra)

	if err != nil {
		apierrors.HandleAPIError(c.Config.Logger, c.Config.Alerter, w, r, apierrors.NewErrInternal(err), true)
		return
	}

	// switch on the kind of resource and write the corresponding objects to the database
	switch req.Kind {
	case string(types.InfraECR):
		_, err = createECRRegistry(c.Config, infra, operation, req.Output)
	case string(types.InfraEKS):
		_, err = createEKSCluster(c.Config, infra, operation, req.Output)
	case string(types.InfraRDS):
		_, err = createRDSDatabase(c.Config, infra, operation, req.Output)
	case string(types.InfraDOCR):
		_, err = createDOCRRegistry(c.Config, infra, operation, req.Output)
	case string(types.InfraDOKS):
		_, err = createDOKSCluster(c.Config, infra, operation, req.Output)
	case string(types.InfraGCR):
		_, err = createGCRRegistry(c.Config, infra, operation, req.Output)
	case string(types.InfraGKE):
		_, err = createGKECluster(c.Config, infra, operation, req.Output)
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
	// parse the last applied field to get the cluster id
	rdsRequest := &types.RDSInfraLastApplied{}
	err := json.Unmarshal(operation.LastApplied, rdsRequest)

	if err != nil {
		return nil, err
	}

	database := &models.Database{
		ProjectID:        infra.ProjectID,
		ClusterID:        rdsRequest.ClusterID,
		InfraID:          infra.ID,
		InstanceID:       output["rds_instance_id"].(string),
		InstanceEndpoint: output["rds_connection_endpoint"].(string),
		InstanceName:     output["rds_instance_name"].(string),
	}

	database, err = config.Repo.Database().CreateDatabase(database)

	if err != nil {
		return nil, err
	}

	infra.DatabaseID = database.ID
	infra, err = config.Repo.Infra().UpdateInfra(infra)

	if err != nil {
		return nil, err
	}

	err = createRDSEnvGroup(config, infra, database, rdsRequest)

	if err != nil {
		return nil, err
	}

	return database, nil
}

func createEKSCluster(config *config.Config, infra *models.Infra, operation *models.Operation, output map[string]interface{}) (*models.Cluster, error) {
	cluster := &models.Cluster{
		AuthMechanism:            models.AWS,
		ProjectID:                infra.ProjectID,
		AWSIntegrationID:         infra.AWSIntegrationID,
		InfraID:                  infra.ID,
		Name:                     output["cluster_id"].(string),
		Server:                   output["cluster_endpoint"].(string),
		CertificateAuthorityData: []byte(output["cluster_certificate_authority_data"].(string)),
	}

	re := regexp.MustCompile(`^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)?$`)

	// if it matches the base64 regex, decode it
	caData := string(cluster.CertificateAuthorityData)
	if re.MatchString(caData) {
		decoded, err := base64.StdEncoding.DecodeString(caData)

		if err != nil {
			return nil, err
		}

		cluster.CertificateAuthorityData = []byte(decoded)
	}

	cluster, err := config.Repo.Cluster().CreateCluster(cluster)

	if err != nil {
		return nil, err
	}

	return cluster, nil
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

func createDOKSCluster(config *config.Config, infra *models.Infra, operation *models.Operation, output map[string]interface{}) (*models.Cluster, error) {
	cluster := &models.Cluster{
		AuthMechanism:            models.DO,
		ProjectID:                infra.ProjectID,
		DOIntegrationID:          infra.DOIntegrationID,
		InfraID:                  infra.ID,
		Name:                     output["cluster_name"].(string),
		Server:                   output["cluster_endpoint"].(string),
		CertificateAuthorityData: []byte(output["cluster_ca_data"].(string)),
	}

	re := regexp.MustCompile(`^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)?$`)

	// if it matches the base64 regex, decode it
	caData := string(cluster.CertificateAuthorityData)
	if re.MatchString(caData) {
		decoded, err := base64.StdEncoding.DecodeString(caData)

		if err != nil {
			return nil, err
		}

		cluster.CertificateAuthorityData = []byte(decoded)
	}

	return config.Repo.Cluster().CreateCluster(cluster)
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

func createGKECluster(config *config.Config, infra *models.Infra, operation *models.Operation, output map[string]interface{}) (*models.Cluster, error) {
	cluster := &models.Cluster{
		AuthMechanism:            models.GCP,
		ProjectID:                infra.ProjectID,
		GCPIntegrationID:         infra.GCPIntegrationID,
		InfraID:                  infra.ID,
		Name:                     output["cluster_name"].(string),
		Server:                   output["cluster_endpoint"].(string),
		CertificateAuthorityData: []byte(output["cluster_ca_data"].(string)),
	}

	re := regexp.MustCompile(`^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)?$`)

	// if it matches the base64 regex, decode it
	caData := string(cluster.CertificateAuthorityData)
	if re.MatchString(caData) {
		decoded, err := base64.StdEncoding.DecodeString(caData)

		if err != nil {
			return nil, err
		}

		cluster.CertificateAuthorityData = []byte(decoded)
	}

	return config.Repo.Cluster().CreateCluster(cluster)
}

func createRDSEnvGroup(config *config.Config, infra *models.Infra, database *models.Database, rdsConfig *types.RDSInfraLastApplied) error {
	cluster, err := config.Repo.Cluster().ReadCluster(infra.ProjectID, rdsConfig.ClusterID)

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
		Name:      fmt.Sprintf("rds-credentials-%s", rdsConfig.DBName),
		Namespace: rdsConfig.Namespace,
		Variables: map[string]string{},
		SecretVariables: map[string]string{
			"PGPORT":     port,
			"PGHOST":     host,
			"PGPASSWORD": rdsConfig.Password,
			"PGUSER":     rdsConfig.Username,
		},
	})

	if err != nil {
		return fmt.Errorf("failed to create RDS env group: %s", err.Error())
	}

	return nil
}

func deleteRDSEnvGroup(config *config.Config, infra *models.Infra, rdsConfig *types.RDSInfraLastApplied) error {
	cluster, err := config.Repo.Cluster().ReadCluster(infra.ProjectID, rdsConfig.ClusterID)

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

	err = envgroup.DeleteEnvGroup(agent, fmt.Sprintf("rds-credentials-%s", rdsConfig.DBName), rdsConfig.Namespace)

	if err != nil {
		return fmt.Errorf("failed to create RDS env group: %s", err.Error())
	}

	return nil
}
