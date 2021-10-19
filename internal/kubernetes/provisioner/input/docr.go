package input

import (
	"encoding/json"
)

type DOCR struct {
	DOCRName             string `json:"docr_name"`
	DOCRSubscriptionTier string `json:"docr_subscription_tier"`
}

func (docr *DOCR) GetInput() ([]byte, error) {
	return json.Marshal(docr)
}

func GetDOCRInput(bytes []byte) (*DOCR, error) {
	res := &DOCR{}

	err := json.Unmarshal(bytes, res)

	return res, err
}
