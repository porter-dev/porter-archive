package forms

import (
	"github.com/porter-dev/porter/internal/kubernetes"
	"github.com/porter-dev/porter/internal/models"
)

// CreateServiceAccountCandidatesForm represents the accepted values for
// creating a list of ServiceAccountCandidates from a kubeconfig
type CreateServiceAccountCandidatesForm struct {
	ProjectID  uint   `json:"project_id"`
	Kubeconfig string `json:"kubeconfig"`

	// Represents whether the auth mechanism should be designated as
	// "local": if so, the auth mechanism uses local plugins/mechanisms purely from the
	// kubeconfig.
	IsLocal bool `json:"is_local"`
}

// ToServiceAccountCandidates creates a ServiceAccountCandidate from the kubeconfig and
// project id
func (csa *CreateServiceAccountCandidatesForm) ToServiceAccountCandidates(
	isServerLocal bool,
) ([]*models.ServiceAccountCandidate, error) {
	// can only use "local" auth mechanism if the server is running locally
	candidates, err := kubernetes.GetServiceAccountCandidates([]byte(csa.Kubeconfig), isServerLocal && csa.IsLocal)

	if err != nil {
		return nil, err
	}

	for _, saCandidate := range candidates {
		saCandidate.ProjectID = csa.ProjectID
	}

	return candidates, nil
}
