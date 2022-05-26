package state

import (
	"encoding/json"
	"net/http"

	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/provisioner/integrations/redis_stream"
	"github.com/porter-dev/porter/provisioner/server/config"
)

type DeleteResourceHandler struct {
	Config           *config.Config
	decoderValidator shared.RequestDecoderValidator
}

func NewDeleteResourceHandler(
	config *config.Config,
) *DeleteResourceHandler {
	return &DeleteResourceHandler{
		Config:           config,
		decoderValidator: shared.NewDefaultRequestDecoderValidator(config.Logger, config.Alerter),
	}
}

func (c *DeleteResourceHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// read the infra from the attached scope
	infra, _ := r.Context().Value(types.InfraScope).(*models.Infra)
	operation, _ := r.Context().Value(types.OperationScope).(*models.Operation)

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
	err = redis_stream.PushToGlobalStream(c.Config.RedisClient, infra, operation, "destroyed")

	if err != nil {
		apierrors.HandleAPIError(c.Config.Logger, c.Config.Alerter, w, r, apierrors.NewErrInternal(err), true)
		return
	}

	// update the infra to indicate deletion
	infra.Status = "deleted"

	infra, err = c.Config.Repo.Infra().UpdateInfra(infra)

	if err != nil {
		apierrors.HandleAPIError(c.Config.Logger, c.Config.Alerter, w, r, apierrors.NewErrInternal(err), true)
		return
	}

	// switch on the kind of resource and write the corresponding objects to the database
	switch infra.Kind {
	case types.InfraECR, types.InfraGCR, types.InfraDOCR, types.InfraACR:
		_, err = deleteRegistry(c.Config, infra, operation)
	case types.InfraEKS, types.InfraDOKS, types.InfraGKE, types.InfraAKS:
		_, err = deleteCluster(c.Config, infra, operation)
	case types.InfraRDS:
		_, err = deleteDatabase(c.Config, infra, operation)
	case types.InfraS3:
		err = deleteS3Bucket(c.Config, infra, operation)
	}

	if err != nil {
		apierrors.HandleAPIError(c.Config.Logger, c.Config.Alerter, w, r, apierrors.NewErrInternal(err), true)
		return
	}
}

func deleteRegistry(config *config.Config, infra *models.Infra, operation *models.Operation) (*models.Registry, error) {
	reg, err := config.Repo.Registry().ReadRegistryByInfraID(infra.ProjectID, infra.ID)

	if err != nil {
		return nil, err
	}

	err = config.Repo.Registry().DeleteRegistry(reg)

	if err != nil {
		return nil, err
	}

	return reg, nil
}

func deleteCluster(config *config.Config, infra *models.Infra, operation *models.Operation) (*models.Cluster, error) {
	cluster, err := config.Repo.Cluster().ReadClusterByInfraID(infra.ProjectID, infra.ID)

	if err != nil {
		return nil, err
	}

	err = config.Repo.Cluster().DeleteCluster(cluster)

	if err != nil {
		return nil, err
	}

	return cluster, nil
}

func deleteDatabase(config *config.Config, infra *models.Infra, operation *models.Operation) (*models.Database, error) {
	database, err := config.Repo.Database().ReadDatabaseByInfraID(infra.ProjectID, infra.ID)

	if err != nil {
		return nil, err
	}

	err = config.Repo.Database().DeleteDatabase(database.ProjectID, database.ClusterID, database.ID)

	if err != nil {
		return nil, err
	}

	// TODO: add delete env group here

	return database, nil
}

func deleteS3Bucket(config *config.Config, infra *models.Infra, operation *models.Operation) error {
	lastApplied := make(map[string]interface{})

	err := json.Unmarshal(operation.LastApplied, &lastApplied)

	if err != nil {
		return err
	}

	return deleteS3EnvGroup(config, infra, lastApplied)
}
