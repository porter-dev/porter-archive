package types

type DatastoreStatusRequest struct {
	Type string `json:"type"`
	Name string `json:"name"`
}

type DatastoreStatusResponse struct {
	Status string `json:"status"`
}
