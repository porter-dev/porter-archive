package slack

import (
	"bytes"
	"encoding/json"
	"net/http"
	"time"

	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models/integrations"
	"github.com/porter-dev/porter/internal/notifier"
)

type DeploymentNotifier struct {
	slackInts []*integrations.SlackIntegration
	Config    *types.NotificationConfig
}

func NewDeploymentNotifier(conf *types.NotificationConfig, slackInts ...*integrations.SlackIntegration) *DeploymentNotifier {
	return &DeploymentNotifier{
		slackInts: slackInts,
		Config:    conf,
	}
}

type SlackPayload struct {
	Blocks []*SlackBlock `json:"blocks"`
}

type SlackBlock struct {
	Type string     `json:"type"`
	Text *SlackText `json:"text,omitempty"`
}

type SlackText struct {
	Type string `json:"type"`
	Text string `json:"text"`
}

func (s *DeploymentNotifier) Notify(opts *notifier.NotifyOpts) error {
	if s.Config != nil {
		if !s.Config.Enabled {
			return nil
		}
		if opts.Status == notifier.StatusHelmDeployed && !s.Config.Success {
			return nil
		}
		if opts.Status == notifier.StatusPodCrashed && !s.Config.Failure {
			return nil
		}
		if opts.Status == notifier.StatusHelmFailed && !s.Config.Failure {
			return nil
		}
	}

	// we create a basic payload as a fallback if the detailed payload with "info" fails, due to
	// marshaling errors on the Slack API side.
	blocks, basicBlocks := getSlackBlocks(opts)

	slackPayload := &SlackPayload{
		Blocks: blocks,
	}

	basicSlackPayload := &SlackPayload{
		Blocks: basicBlocks,
	}

	basicPayload, err := json.Marshal(basicSlackPayload)

	if err != nil {
		return err
	}

	payload, err := json.Marshal(slackPayload)

	if err != nil {
		return err
	}

	basicReqBody := bytes.NewReader(basicPayload)
	reqBody := bytes.NewReader(payload)
	client := &http.Client{
		Timeout: time.Second * 5,
	}

	for _, slackInt := range s.slackInts {
		resp, err := client.Post(string(slackInt.Webhook), "application/json", reqBody)

		if err != nil || resp.StatusCode != 200 {
			client.Post(string(slackInt.Webhook), "application/json", basicReqBody)
		}
	}

	return nil
}
