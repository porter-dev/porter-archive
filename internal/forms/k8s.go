package forms

import (
	"github.com/porter-dev/porter/internal/kubernetes"
	"github.com/porter-dev/porter/internal/repository"
)

// K8sForm is the generic base type for CRUD operations on k8s objects
type K8sForm struct {
	K8sOptions *kubernetes.OutOfClusterConfig `json:"k8s" form:"required"`
	UserID     uint                           `json:"user_id"`
}

// PopulateK8sOptions uses the passed user ID to populate the HelmOptions object
func (kf *K8sForm) PopulateK8sOptions(repo repository.UserRepository) error {
	user, err := repo.ReadUser(kf.UserID)

	if err != nil {
		return err
	}

	kf.K8sOptions.AllowedContexts = user.ContextToSlice()
	kf.K8sOptions.KubeConfig = user.RawKubeConfig

	return nil
}
