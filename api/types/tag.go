package types

type CreateTagRequest struct {
	Name  string `json:"name" form:"required"`
	Color string `json:"color" form:"required"`
}
