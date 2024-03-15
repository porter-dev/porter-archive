package v2

import (
	"encoding/json"
)

// OperationType represents a JSON patch operation type
type OperationType string

const (
	// AddOperation indicates that a value should be added to a JSON object or array
	AddOperation OperationType = "add"
	// RemoveOperation indicates that a value should be removed from a JSON object or array
	RemoveOperation OperationType = "remove"
	// ReplaceOperation indicates that a value should be replaced in a JSON object or array
	ReplaceOperation OperationType = "replace"
	// MoveOperation indicates that a value should be moved within a JSON object or array
	MoveOperation OperationType = "move"
	// CopyOperation indicates that a value should be copied within a JSON object or array
	CopyOperation OperationType = "copy"
)

// PatchOperation represents a full JSON patch operation
type PatchOperation struct {
	// Operation is the type of operation to perform
	Operation OperationType `json:"op"`
	// Path is the JSON pointer to the value to be operated on
	Path string `json:"path"`
	// Value is the value to be added, replaced, or moved
	Value interface{} `json:"value,omitempty"`
}

func (op PatchOperation) String() (string, error) {
	var res string

	by, err := json.Marshal(op)
	if err != nil {
		return res, err
	}

	return string(by), nil
}

// ApplyFlag is an interface that represents a flag that can be applied to a PorterApp
// removal operations are handled separately
type ApplyFlag interface {
	AsPatchOperations() []PatchOperation
}

// SetName is a flag that can be applied to a PorterApp to set the name
type SetName struct {
	Name string
}

// AsPatchOperations returns the patch operations to set the name
func (f SetName) AsPatchOperations() []PatchOperation {
	return []PatchOperation{
		{
			Operation: ReplaceOperation,
			Path:      "/name",
			Value:     f.Name,
		},
	}
}

// AttachEnvGroupsFlag is a flag that can be applied to a PorterApp to attach environment groups
type AttachEnvGroupsFlag struct {
	EnvGroups []string
}

// envGroupWithoutVersion is a struct that represents an environment group without a version
// the version will be auto added on hydrate
type envGroupWithoutVersion struct {
	Name string `json:"name"`
}

// AsPatchOperations returns the patch operations to attach the environment groups
func (f AttachEnvGroupsFlag) AsPatchOperations() []PatchOperation {
	var envGroups []envGroupWithoutVersion

	for _, envGroup := range f.EnvGroups {
		envGroups = append(envGroups, envGroupWithoutVersion{
			Name: envGroup,
		})
	}

	var ops []PatchOperation

	for _, envGroup := range envGroups {
		ops = append(ops, PatchOperation{
			Operation: AddOperation,
			Path:      "/envGroups/-",
			Value:     envGroup,
		})
	}

	return ops
}

// SetBuildContext is a flag that can be applied to a PorterApp to set the build context
type SetBuildContext struct {
	Context string
}

// AsPatchOperations returns the patch operations to set the build context
func (f SetBuildContext) AsPatchOperations() []PatchOperation {
	return []PatchOperation{
		{
			Operation: ReplaceOperation,
			Path:      "/build/context",
			Value:     f.Context,
		},
	}
}

// SetBuildMethod is a flag that can be applied to a PorterApp to set the build method
type SetBuildMethod struct {
	Method string
}

// AsPatchOperations returns the patch operations to set the build method
func (f SetBuildMethod) AsPatchOperations() []PatchOperation {
	return []PatchOperation{
		{
			Operation: ReplaceOperation,
			Path:      "/build/method",
			Value:     f.Method,
		},
	}
}

// SetBuildDockerfile is a flag that can be applied to a PorterApp to set the build Dockerfile
type SetBuildDockerfile struct {
	Dockerfile string
}

// AsPatchOperations returns the patch operations to set the build Dockerfile
func (f SetBuildDockerfile) AsPatchOperations() []PatchOperation {
	return []PatchOperation{
		{
			Operation: ReplaceOperation,
			Path:      "/build/dockerfile",
			Value:     f.Dockerfile,
		},
	}
}

// AttachBuildpacks is a flag that can be applied to a PorterApp to attach buildpacks
type AttachBuildpacks struct {
	Buildpacks []string
}

// AsPatchOperations returns the patch operations to attach the buildpacks
func (f AttachBuildpacks) AsPatchOperations() []PatchOperation {
	var ops []PatchOperation

	for _, buildpack := range f.Buildpacks {
		ops = append(ops, PatchOperation{
			Operation: AddOperation,
			Path:      "/build/buildpacks/-",
			Value:     buildpack,
		})
	}

	return ops
}

// SetBuilder is a flag that can be applied to a PorterApp to set the builder
type SetBuilder struct {
	Builder string
}

// AsPatchOperations returns the patch operations to set the builder
func (f SetBuilder) AsPatchOperations() []PatchOperation {
	return []PatchOperation{
		{
			Operation: ReplaceOperation,
			Path:      "/build/builder",
			Value:     f.Builder,
		},
	}
}

// SetImageRepo is a flag that can be applied to a PorterApp to set the image repo
type SetImageRepo struct {
	Repo string
}

// AsPatchOperations returns the patch operations to set the image repo
func (f SetImageRepo) AsPatchOperations() []PatchOperation {
	return []PatchOperation{
		{
			Operation: ReplaceOperation,
			Path:      "/image/repository",
			Value:     f.Repo,
		},
	}
}

// SetImageTag is a flag that can be applied to a PorterApp to set the image tag
type SetImageTag struct {
	Tag string
}

// AsPatchOperations returns the patch operations to set the image tag
func (f SetImageTag) AsPatchOperations() []PatchOperation {
	return []PatchOperation{
		{
			Operation: ReplaceOperation,
			Path:      "/image/tag",
			Value:     f.Tag,
		},
	}
}
