package slack

import (
	"bytes"
	"encoding/json"
	"fmt"
	"github.com/porter-dev/porter/internal/models"
	"net/http"
	"strings"
	"time"

	"github.com/porter-dev/porter/internal/models/integrations"
)

type Notifier interface {
	Notify(opts *NotifyOpts) error
}

type DeploymentStatus string

const (
	StatusDeployed string = "deployed"
	StatusFailed   string = "failed"
)

type NotifyOpts struct {
	// ProjectID is the id of the Porter project that this deployment belongs to
	ProjectID uint

	// ClusterID is the id of the Porter cluster that this deployment belongs to
	ClusterID uint

	// ClusterName is the name of the cluster that this deployment was deployed in
	ClusterName string

	// Status is the current status of the deployment.
	Status string

	// Info is any additional information about this status, such as an error message if
	// the deployment failed.
	Info string

	// Name is the name of the deployment that this notification refers to.
	Name string

	// Namespace is the Kubernetes namespace of the deployment that this notification refers to.
	Namespace string

	URL string

	Version int
}

type SlackNotifier struct {
	slackInts []*integrations.SlackIntegration
	Config    *models.NotificationConfigExternal
}

func NewSlackNotifier(conf *models.NotificationConfigExternal, slackInts ...*integrations.SlackIntegration) Notifier {
	return &SlackNotifier{
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

func (s *SlackNotifier) Notify(opts *NotifyOpts) error {
	if s.Config != nil {
		if !s.Config.Enabled {
			return nil
		}
		if opts.Status == StatusDeployed && !s.Config.Success {
			return nil
		}
		if opts.Status == StatusFailed && !s.Config.Failure {
			return nil
		}
	}

	blocks := []*SlackBlock{
		getMessageBlock(opts),
		getDividerBlock(),
		getMarkdownBlock(fmt.Sprintf("*Name:* %s", "`"+opts.Name+"`")),
		getMarkdownBlock(fmt.Sprintf("*Namespace:* %s", "`"+opts.Namespace+"`")),
		getMarkdownBlock(fmt.Sprintf("*Version:* %d", opts.Version)),
	}

	// we create a basic payload as a fallback if the detailed payload with "info" fails, due to
	// marshaling errors on the Slack API side.
	basicSlackPayload := &SlackPayload{
		Blocks: blocks,
	}

	infoBlock := getInfoBlock(opts)

	if infoBlock != nil {
		blocks = append(blocks, infoBlock)
	}

	slackPayload := &SlackPayload{
		Blocks: blocks,
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

func getDividerBlock() *SlackBlock {
	return &SlackBlock{
		Type: "divider",
	}
}

func getMarkdownBlock(md string) *SlackBlock {
	return &SlackBlock{
		Type: "section",
		Text: &SlackText{
			Type: "mrkdwn",
			Text: md,
		},
	}
}

func getMessageBlock(opts *NotifyOpts) *SlackBlock {
	var md string

	switch opts.Status {
	case StatusDeployed:
		md = getSuccessMessage(opts)
	case StatusFailed:
		md = getFailedMessage(opts)
	}

	return getMarkdownBlock(md)
}

func getInfoBlock(opts *NotifyOpts) *SlackBlock {
	var md string

	switch opts.Status {
	case StatusFailed:
		md = getFailedInfoMessage(opts)
	default:
		return nil
	}

	return getMarkdownBlock(md)
}

func getSuccessMessage(opts *NotifyOpts) string {
	return fmt.Sprintf(
		":rocket: Your application %s was successfully updated on Porter! <%s|View the new release.>",
		"`"+opts.Name+"`",
		opts.URL,
	)
}

func getFailedMessage(opts *NotifyOpts) string {
	return fmt.Sprintf(
		":x: Your application %s failed to deploy on Porter. <%s|View the status here.>",
		"`"+opts.Name+"`",
		opts.URL,
	)
}

func getFailedInfoMessage(opts *NotifyOpts) string {
	info := opts.Info

	// TODO: this casing is quite ugly and looks for particular types of API server
	// errors, otherwise it truncates the error message to 200 characters. This should
	// handle the errors more gracefully.
	if strings.Contains(info, "Invalid value:") {
		errArr := strings.Split(info, "Invalid value:")

		// look for "unmarshalerDecoder" error
		if strings.Contains(info, "unmarshalerDecoder") {
			udArr := strings.Split(info, "unmarshalerDecoder:")

			info = errArr[0] + udArr[1]
		} else {
			info = errArr[0] + "..."
		}
	} else if len(info) > 200 {
		info = info[0:200] + "..."
	}

	return fmt.Sprintf("```\n%s\n```", info)
}
