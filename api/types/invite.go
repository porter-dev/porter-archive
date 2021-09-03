package types

type Invite struct {
	ID       uint   `json:"id"`
	Token    string `json:"token"`
	Expired  bool   `json:"expired"`
	Email    string `json:"email"`
	Accepted bool   `json:"accepted"`
	Kind     string `json:"kind"`
}

type GetInviteResponse Invite

type CreateInviteRequest struct {
	Email string `json:"email,required"`
	Kind  string `json:"kind,required"`
}

type CreateInviteResponse struct {
	*Invite
}

type ListInvitesResponse []*Invite

type UpdateInviteRoleRequest struct {
	Kind string `json:"kind,required"`
}

type AcceptInviteRequest struct {
	Token string `schema:"token,required"`
}
