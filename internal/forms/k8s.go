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
	repo repository.ClusterRepository,
) error {
	if clusterID, ok := vals["cluster_id"]; ok && len(clusterID) == 1 {
		id, err := strconv.ParseUint(clusterID[0], 10, 64)

		if err != nil {
			return err
		}

		cluster, err := repo.ReadCluster(uint(id))

		if err != nil {
			return err
		}

		kf.Cluster = cluster
	}

	return nil
}

type ConfigMapForm struct {
	Name               string            `json:"name" form:"required"`
	Namespace          string            `json:"namespace" form:"required"`
	EnvVariables       map[string]string `json:"variables"`
	SecretEnvVariables map[string]string `json:"secret_variables"`
}

type RenameConfigMapForm struct {
	Name      string `json:"name" form:"required"`
	Namespace string `json:"namespace" form:"required"`
	NewName   string `json:"new_name" form:"required"`
}

type NamespaceForm struct {
	Name string `json:"name" form:"required"`
}