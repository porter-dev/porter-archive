package types

const (
	URLParamSlackIntegrationID = "slack_integration_id"
)

type SlackIntegration struct {
	ID uint `json:"id"`

	ProjectID uint `json:"project_id"`

	// The ID for the Slack team
	TeamID string `json:"team_id"`

	// The name of the Slack team
	TeamName string `json:"team_name"`

	// The icon url for the Slack team
	TeamIconURL string `json:"team_icon_url"`

	// The channel name that the Slack app is installed in
	Channel string `json:"channel"`

	// The URL for configuring the workspace app instance
	ConfigurationURL string `json:"configuration_url"`
}

type ListSlackIntegrationsResponse []*SlackIntegration
