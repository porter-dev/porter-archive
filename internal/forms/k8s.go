package forms

import (
	"net/url"

	"github.com/porter-dev/porter/internal/kubernetes"
	"github.com/porter-dev/porter/internal/repository"
)

// K8sForm is the generic base type for CRUD operations on k8s objects
type K8sForm struct {
	*kubernetes.OutOfClusterConfig
}

// PopulateK8sOptionsFromQueryParams populates fields in the ChartForm using the passed
// url.Values (the parsed query params)
func (kf *K8sForm) PopulateK8sOptionsFromQueryParams(vals url.Values) {
	if context, ok := vals["context"]; ok && len(context) == 1 {
		kf.Context = context[0]
	}
}

// PopulateK8sOptionsFromUserID uses the passed userID to populate the HelmOptions object
func (kf *K8sForm) PopulateK8sOptionsFromUserID(userID uint, repo repository.UserRepository) error {
	user, err := repo.ReadUser(userID)

	if err != nil {
		return err
	}

	kf.AllowedContexts = user.ContextToSlice()
	kf.KubeConfig = user.RawKubeConfig

	return nil
}
