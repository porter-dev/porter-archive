package input

import (
	"encoding/json"
)

type DOKS struct {
	DORegion    string `json:"do_region"`
	ClusterName string `json:"cluster_name"`
}

func (doks *DOKS) GetInput() ([]byte, error) {
	return json.Marshal(doks)
}

func GetDOKSInput(bytes []byte) (*DOKS, error) {
	res := &DOKS{}

	err := json.Unmarshal(bytes, res)

	return res, err
}
