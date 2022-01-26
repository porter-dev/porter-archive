package types

type ProvisionBaseRequest struct {
	Kind   string                 `json:"kind"`
	Values map[string]interface{} `json:"values"`
}

type CreateResourceRequest struct {
	Kind   string                 `json:"kind"`
	Output map[string]interface{} `json:"output"`
}
