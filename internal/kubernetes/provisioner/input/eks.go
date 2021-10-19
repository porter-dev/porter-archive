package input

import (
	"encoding/json"
)

type EKS struct {
	AWSRegion   string `json:"aws_region"`
	ClusterName string `json:"cluster_name"`
	MachineType string `json:"machine_type"`
}

func (eks *EKS) GetInput() ([]byte, error) {
	return json.Marshal(eks)
}

func GetEKSInput(bytes []byte) (*EKS, error) {
	res := &EKS{}

	err := json.Unmarshal(bytes, res)

	return res, err
}
