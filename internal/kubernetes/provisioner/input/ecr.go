package input

import (
	"encoding/json"
)

type ECR struct {
	AWSRegion    string `json:"aws_region"`
	AWSAccessKey string `json:"aws_access_key"`
	AWSSecretKey string `json:"aws_secret_key"`
	ECRName      string `json:"ecr_name"`
}

func (ecr *ECR) GetInput() ([]byte, error) {
	return json.Marshal(ecr)
}

func GetECRInput(bytes []byte) (*ECR, error) {
	res := &ECR{}

	err := json.Unmarshal(bytes, res)

	return res, err
}
