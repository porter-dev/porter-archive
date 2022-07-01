package status

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
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
	resp, err := http.Get("https://www.githubstatus.com/api/v2/incidents/unresolved.json")

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(fmt.Errorf("error fetching github incidents: %w", err)))
		return
	}

	defer resp.Body.Close()

	data, err := io.ReadAll(resp.Body)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(fmt.Errorf("error reading github incidents: %w", err)))
		return
	}

	var incidents types.GithubUnresolvedIncidents

	err = json.Unmarshal(data, &incidents)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(fmt.Errorf("error unmarshalling json: %w", err)))
		return
	}

	if len(incidents.Incidents) > 0 {
		c.WriteResult(w, r, fmt.Sprintf("https://www.githubstatus.com/incidents/%s", incidents.Incidents[0].ID))
		return
	}

	c.WriteResult(w, r, "no active incidents")
}
