package types

type RoleKind string

const (
	RoleAdmin     RoleKind = "admin"
	RoleDeveloper RoleKind = "developer"
	RoleViewer    RoleKind = "viewer"
	RoleCustom    RoleKind = "custom"
)

type Role struct {
	Kind      RoleKind `json:"kind"`
	UserID    uint     `json:"user_id"`
	ProjectID uint     `json:"project_id"`
}
