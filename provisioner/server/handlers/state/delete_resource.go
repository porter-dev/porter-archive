package state

import (
	"fmt"
	"net/http"

	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
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

	fmt.Println("destroying", infra.ID, operation.UID)

	// update the operation to indicate completion
	operation.Status = "completed"

	operation, err := c.Config.Repo.Infra().UpdateOperation(operation)

	if err != nil {
		apierrors.HandleAPIError(c.Config.Logger, c.Config.Alerter, w, r, apierrors.NewErrInternal(err), true)
		return
	}

	// switch on the kind of resource and write the corresponding objects to the database
	switch infra.Kind {
	case types.InfraECR:
	case types.InfraGCR:
	case types.InfraDOCR:
		_, err = deleteRegistry(c.Config, infra, operation)
	case types.InfraEKS:
	case types.InfraDOKS:
	case types.InfraGKE:
		_, err = deleteCluster(c.Config, infra, operation)
	case types.InfraRDS:
		_, err = deleteDatabase(c.Config, infra, operation)
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

	return database, nil
}
