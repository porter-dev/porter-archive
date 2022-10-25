package slack

import (
	"fmt"
	"strings"

	"github.com/porter-dev/porter/internal/notifier"
)

func getSlackBlocks(opts *notifier.NotifyOpts) ([]*SlackBlock, []*SlackBlock) {
	res := []*SlackBlock{}

	if opts.Status == notifier.StatusHelmDeployed || opts.Status == notifier.StatusHelmFailed {
		res = append(res, getHelmMessageBlock(opts))
	} else if opts.Status == notifier.StatusPodCrashed {
		res = append(res, getPodCrashedMessageBlock(opts))
	}

	res = append(
		res,
		getDividerBlock(),
		getMarkdownBlock(fmt.Sprintf("*Name:* %s", "`"+opts.Name+"`")),
		getMarkdownBlock(fmt.Sprintf("*Namespace:* %s", "`"+opts.Namespace+"`")),
	)

	if opts.Timestamp != nil {
		res = append(res, getMarkdownBlock(fmt.Sprintf(
			"*Timestamp:* <!date^%d^Alerted at {date_num} {time_secs}|Alerted at %s>",
			opts.Timestamp.Unix(),
			opts.Timestamp.Format("2006-01-02 15:04:05 UTC"),
		)),
		)
	}

	if opts.Status == notifier.StatusHelmDeployed || opts.Status == notifier.StatusHelmFailed {
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

func getHelmMessageBlock(opts *notifier.NotifyOpts) *SlackBlock {
	var md string

	switch opts.Status {
	case notifier.StatusHelmDeployed:
		md = getHelmSuccessMessage(opts)
	case notifier.StatusHelmFailed:
		md = getHelmFailedMessage(opts)
	}

	return getMarkdownBlock(md)
}

func getPodCrashedMessageBlock(opts *notifier.NotifyOpts) *SlackBlock {
	md := fmt.Sprintf(
		":x: Your application %s crashed on Porter. <%s|View the application.>",
		"`"+opts.Name+"`",
		opts.URL,
	)

	return getMarkdownBlock(md)
}

func getInfoBlock(opts *notifier.NotifyOpts) *SlackBlock {
	var md string

	switch opts.Status {
	case notifier.StatusHelmFailed:
		md = getFailedInfoMessage(opts)
	case notifier.StatusPodCrashed:
		md = getFailedInfoMessage(opts)
	default:
		return nil
	}

	return getMarkdownBlock(md)
}

func getHelmSuccessMessage(opts *notifier.NotifyOpts) string {
	return fmt.Sprintf(
		":rocket: Your application %s was successfully updated on Porter! <%s|View the new release.>",
		"`"+opts.Name+"`",
		opts.URL,
	)
}

func getHelmFailedMessage(opts *notifier.NotifyOpts) string {
	return fmt.Sprintf(
		":x: Your application %s failed to deploy on Porter. <%s|View the status here.>",
		"`"+opts.Name+"`",
		opts.URL,
	)
}

func getFailedInfoMessage(opts *notifier.NotifyOpts) string {
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
