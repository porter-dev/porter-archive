package slack

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models/integrations"
)

type Notifier interface {
	Notify(opts *NotifyOpts) error
}

type DeploymentStatus string

const (
	StatusHelmDeployed DeploymentStatus = "helm_deployed"
	StatusPodCrashed   DeploymentStatus = "pod_crashed"
	StatusHelmFailed   DeploymentStatus = "helm_failed"
)

type NotifyOpts struct {
	// ProjectID is the id of the Porter project that this deployment belongs to
	ProjectID uint

	// ClusterID is the id of the Porter cluster that this deployment belongs to
	ClusterID uint

	// ClusterName is the name of the cluster that this deployment was deployed in
	ClusterName string

	// Status is the current status of the deployment.
	Status DeploymentStatus

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
	Config    *types.NotificationConfig
}

func NewSlackNotifier(conf *types.NotificationConfig, slackInts ...*integrations.SlackIntegration) Notifier {
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
		if opts.Status == StatusHelmDeployed && !s.Config.Success {
			return nil
		}
		if opts.Status == StatusPodCrashed && !s.Config.Failure {
			return nil
		}
		if opts.Status == StatusHelmFailed && !s.Config.Failure {
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

func getSlackBlocks(opts *NotifyOpts) ([]*SlackBlock, []*SlackBlock) {
	res := []*SlackBlock{}

	if opts.Status == StatusHelmDeployed || opts.Status == StatusHelmFailed {
		res = append(res, getHelmMessageBlock(opts))
	} else if opts.Status == StatusPodCrashed {
		res = append(res, getPodCrashedMessageBlock(opts))
	}

	res = append(
		res,
		getDividerBlock(),
		getMarkdownBlock(fmt.Sprintf("*Name:* %s", "`"+opts.Name+"`")),
		getMarkdownBlock(fmt.Sprintf("*Namespace:* %s", "`"+opts.Namespace+"`")),
	)

	if opts.Status == StatusHelmDeployed || opts.Status == StatusHelmFailed {
		res = append(res, getMarkdownBlock(fmt.Sprintf("*Version:* %d", opts.Version)))
	}

	basicRes := res

	infoBlock := getInfoBlock(opts)

	if infoBlock != nil {
		res = append(res, infoBlock)
	}

	return res, basicRes
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

func getHelmMessageBlock(opts *NotifyOpts) *SlackBlock {
	var md string

	switch opts.Status {
	case StatusHelmDeployed:
		md = getHelmSuccessMessage(opts)
	case StatusHelmFailed:
		md = getHelmFailedMessage(opts)
	}

	return getMarkdownBlock(md)
}

func getPodCrashedMessageBlock(opts *NotifyOpts) *SlackBlock {
	md := fmt.Sprintf(
		":x: Your application %s crashed on Porter. <%s|View the application.>",
		"`"+opts.Name+"`",
		opts.URL,
	)

	return getMarkdownBlock(md)
}

func getInfoBlock(opts *NotifyOpts) *SlackBlock {
	var md string

	switch opts.Status {
	case StatusHelmFailed:
		md = getFailedInfoMessage(opts)
	case StatusPodCrashed:
		md = getFailedInfoMessage(opts)
	default:
		return nil
	}

	return getMarkdownBlock(md)
}

func getHelmSuccessMessage(opts *NotifyOpts) string {
	return fmt.Sprintf(
		":rocket: Your application %s was successfully updated on Porter! <%s|View the new release.>",
		"`"+opts.Name+"`",
		opts.URL,
	)
}

func getHelmFailedMessage(opts *NotifyOpts) string {
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
