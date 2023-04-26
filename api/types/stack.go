package types

type CreateStackReleaseRequest struct {
	StackName        string    `json:"stack_name" form:"required,dns1123"`
	PorterYAMLBase64 string    `json:"porter_yaml" form:"required"`
	ImageInfo        ImageInfo `json:"image_info" form:"omitempty"`
}

type ImageInfo struct {
	Repository string `json:"repository"`
	Tag        string `json:"tag"`
}
