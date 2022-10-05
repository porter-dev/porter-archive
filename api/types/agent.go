package types

type GetAgentResponse struct {
	Version       string `json:"version"`
	LatestVersion string `json:"latest_version"`
	ShouldUpgrade bool   `json:"should_upgrade"`
}
