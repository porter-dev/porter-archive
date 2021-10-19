package input

import (
	"encoding/json"
)

type GCR struct {
	GCPRegion    string `json:"gcp_region"`
	GCPProjectID string `json:"gcp_project_id"`
}

func (gcr *GCR) GetInput() ([]byte, error) {
	return json.Marshal(gcr)
}

func GetGCRInput(bytes []byte) (*GCR, error) {
	res := &GCR{}

	err := json.Unmarshal(bytes, res)

	return res, err
}
