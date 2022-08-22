package types

const (
	URLParamInviteToken = "token"
)

type Invite struct {
	ID       uint     `json:"id"`
	Token    string   `json:"token"`
	Expired  bool     `json:"expired"`
	Email    string   `json:"email"`
	Accepted bool     `json:"accepted"`
	Kind     string   `json:"kind"`
	Roles    []string `json:"roles"`
}

type GetInviteResponse Invite

type CreateInviteRequest struct {
	Email    string   `json:"email" form:"required"`
	Kind     string   `json:"kind"`
	RoleUIDs []string `json:"roles"`
}

type CreateInviteResponse struct {
	*Invite
}

type ListInvitesResponse []*Invite

type UpdateInviteRoleRequest struct {
	Kind     string   `json:"kind"`
	RoleUIDs []string `json:"roles"`
}
