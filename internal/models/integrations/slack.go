package integrations

import (
	"gorm.io/gorm"

	"github.com/porter-dev/porter/api/types"
)

// SlackIntegration is a webhook notifier to a specific channel in a Slack workspace.
type SlackIntegration struct {
	gorm.Model
	SharedOAuthModel

	// The name of the auth mechanism
	Client types.OAuthIntegrationClient `json:"client"`

	// The id of the user that linked this auth mechanism
	UserID uint `json:"user_id"`

	// The project that this integration belongs to
	ProjectID uint `json:"project_id"`

	// The ID for the Slack team
	TeamID string

	// The name of the Slack team
	TeamName string

	// The icon url for the Slack team
	TeamIconURL string

	// The channel name that the Slack app is installed in
	Channel string

	// The channel id that the Slack app is installed in
	ChannelID string

	// The URL for configuring the workspace app instance
	ConfigurationURL string

	// ------------------------------------------------------------------
	// All fields below encrypted before storage.
	// ------------------------------------------------------------------

	// The webhook to call
	Webhook []byte
}

func (s *SlackIntegration) ToSlackIntegraionType() *types.SlackIntegration {
	return &types.SlackIntegration{
		ID:               s.ID,
		ProjectID:        s.ProjectID,
		TeamID:           s.TeamID,
		TeamName:         s.TeamName,
		TeamIconURL:      s.TeamIconURL,
		Channel:          s.Channel,
		ConfigurationURL: s.ConfigurationURL,
	}
}
