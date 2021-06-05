package shared

type Capabilities struct {
	Provisioning bool `json:"provisioner"`
	Github       bool `json:"github"`
	BasicLogin   bool `json:"basic_login"`
	GithubLogin  bool `json:"github_login"`
	GoogleLogin  bool `json:"google_login"`
	Email        bool `json:"email"`
	Analytics    bool `json:"analytics"`
}
