package status

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/mmcdole/gofeed"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
)

type GetGithubStatusHandler struct {
	handlers.PorterHandlerWriter
}

func NewGetGithubStatusHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *GetGithubStatusHandler {
	return &GetGithubStatusHandler{
		PorterHandlerWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
	}
}

func (c *GetGithubStatusHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	fp := gofeed.NewParser()
	feed, err := fp.ParseURL("https://www.githubstatus.com/history.rss")

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(fmt.Errorf("error fetching github status RSS: %w", err)))
		return
	}

	if len(feed.Items) > 0 {
		description := feed.Items[0].Description
		link := feed.Items[0].Link

		if !strings.Contains(description, "This incident has been resolved") {
			// ongoing incident
			c.WriteResult(w, r, link)
			return
		}
	}

	c.WriteResult(w, r, "no active incidents")
}
