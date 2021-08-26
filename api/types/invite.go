package types

type Invite struct {
	ID       uint   `json:"id"`
	Token    string `json:"token"`
	Expired  bool   `json:"expired"`
	Email    string `json:"email"`
	Accepted bool   `json:"accepted"`
	Kind     string `json:"kind"`
}
