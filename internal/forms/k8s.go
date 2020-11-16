package forms

import (
	"net/url"
	"strconv"

	"github.com/porter-dev/porter/internal/kubernetes"
	"github.com/porter-dev/porter/internal/repository"
)

// K8sForm is the generic base type for CRUD operations on k8s objects
type K8sForm struct {
	*kubernetes.OutOfClusterConfig
}

// PopulateK8sOptionsFromQueryParams populates fields in the ReleaseForm using the passed
// url.Values (the parsed query params)
func (kf *K8sForm) PopulateK8sOptionsFromQueryParams(
	vals url.Values,
	repo repository.ServiceAccountRepository,
) error {
	if clusterID, ok := vals["cluster_id"]; ok && len(clusterID) == 1 {
		id, err := strconv.ParseUint(clusterID[0], 10, 64)

		if err != nil {
			return err
		}

		kf.ClusterID = uint(id)
	}

	if serviceAccountID, ok := vals["service_account_id"]; ok && len(serviceAccountID) == 1 {
		id, err := strconv.ParseUint(serviceAccountID[0], 10, 64)

		if err != nil {
			return err
		}

		sa, err := repo.ReadServiceAccount(uint(id))

		if err != nil {
			return err
		}

		kf.ServiceAccount = sa
	}

	return nil
}
