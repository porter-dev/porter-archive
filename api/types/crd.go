package types

type DeleteCRDRequest struct {
	Name      string `schema:"name" form:"required"`
	Namespace string `schema:"namespace" form:"required"`
	Group     string `schema:"group" form:"required"`
	Version   string `schema:"version" form:"required"`
	Resource  string `schema:"resource" form:"required"`
}

type StreamCRDRequest struct {
	Namespace string `json:"namespace"`
	Group     string `json:"group" form:"required"`
	Version   string `json:"version" form:"required"`
	Resource  string `json:"resource" form:"required"`
}
