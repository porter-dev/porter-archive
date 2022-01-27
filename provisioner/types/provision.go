package types

type ApplyBaseRequest struct {
	Kind          string                 `json:"kind"`
	Values        map[string]interface{} `json:"values"`
	OperationKind string                 `json:"operation_kind" form:"oneof=create retry_create"`
}

type DeleteBaseRequest struct {
	OperationKind string `json:"operation_kind" form:"oneof=delete retry_delete"`
}
type CreateResourceRequest struct {
	Kind   string                 `json:"kind"`
	Output map[string]interface{} `json:"output"`
}

type ReportErrorRequest struct {
	Error string `json:"error"`
}
