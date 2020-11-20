package forms

import (
	"github.com/porter-dev/porter/internal/kubernetes"
	"github.com/porter-dev/porter/internal/models"
)

// CreateClusterCandidatesForm represents the accepted values for
// creating a list of ClusterCandidates from a kubeconfig
type CreateClusterCandidatesForm struct {
	ProjectID  uint   `json:"project_id"`
	Kubeconfig string `json:"kubeconfig"`

	// Represents whether the auth mechanism should be designated as
	// "local": if so, the auth mechanism uses local plugins/mechanisms purely from the
	// kubeconfig.
	IsLocal bool `json:"is_local"`
}

// ToClusterCandidates creates a ClusterCandidate from the kubeconfig and
// project id
func (csa *CreateClusterCandidatesForm) ToClusterCandidates(
	isServerLocal bool,
) ([]*models.ClusterCandidate, error) {
	candidates, err := kubernetes.GetClusterCandidatesFromKubeconfig(
		[]byte(csa.Kubeconfig),
		csa.ProjectID,
		// can only use "local" auth mechanism if the server is running locally
		isServerLocal && csa.IsLocal,
	)

	if err != nil {
		return nil, err
	}

	for _, cc := range candidates {
		cc.ProjectID = csa.ProjectID
	}

	return candidates, nil
}
