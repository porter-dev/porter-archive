package api

import (
	"net/http"
	"strconv"

	"github.com/go-chi/chi"
	"github.com/porter-dev/porter/internal/kubernetes"
)

// HandleProvisionTest will create a test resource by deploying a provisioner
// container pod. This assumes the integration_id was passed as a query param
func (app *App) HandleProvisionTest(w http.ResponseWriter, r *http.Request) {
	projID, err := strconv.ParseUint(chi.URLParam(r, "project_id"), 0, 64)

	if err != nil || projID == 0 {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	// create a new agent
	agent, err := kubernetes.GetAgentInClusterConfig()

	if err != nil {
		app.handleErrorDataRead(err, w)
		return
	}

	_, err = agent.ProvisionTest(uint(projID))

	if err != nil {
		app.handleErrorInternal(err, w)
		return
	}

	w.WriteHeader(http.StatusOK)
}
