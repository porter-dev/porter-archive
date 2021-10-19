package input

import (
	"encoding/json"
)

type GKE struct {
	GCPRegion    string `json:"gcp_region"`
	GCPProjectID string `json:"gcp_project_id"`
	ClusterName  string `json:"cluster_name"`
}

func (gke *GKE) GetInput() ([]byte, error) {
	return json.Marshal(gke)
}

func GetGKEInput(bytes []byte) (*GKE, error) {
	res := &GKE{}

	err := json.Unmarshal(bytes, res)

	return res, err
}
