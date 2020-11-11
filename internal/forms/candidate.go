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
}

// ToServiceAccountCandidates creates a ServiceAccountCandidate from the kubeconfig and
// project id
func (csa *CreateServiceAccountCandidatesForm) ToServiceAccountCandidates() ([]*models.ServiceAccountCandidate, error) {
	candidates, err := kubernetes.GetServiceAccountCandidates([]byte(csa.Kubeconfig))

	if err != nil {
		return nil, err
	}

	for _, saCandidate := range candidates {
		saCandidate.ProjectID = csa.ProjectID
	}

	return candidates, nil
}
