package types

type ProvisionBaseRequest struct {
	Kind          string                 `json:"kind"`
	Values        map[string]interface{} `json:"values"`
	OperationKind string                 `json:"operation_kind" form:"oneof=create retry_create delete retry_delete"`
}

type CreateResourceRequest struct {
	Kind   string                 `json:"kind"`
	Output map[string]interface{} `json:"output"`
}

type ReportErrorRequest struct {
	Error string `json:"error"`
}
