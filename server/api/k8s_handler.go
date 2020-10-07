package api

import (
	"encoding/json"
	"net/http"

	"github.com/porter-dev/porter/internal/kubernetes"

	"github.com/porter-dev/porter/internal/forms"
)

// Enumeration of k8s API error codes, represented as int64
const (
	ErrK8sDecode ErrorCode = iota + 600
	ErrK8sValidate
)

// HandleListNamespaces retrieves a list of namespaces
func (app *App) HandleListNamespaces(w http.ResponseWriter, r *http.Request) {
	form := &forms.K8sForm{}

	// decode from JSON to form value
	if err := json.NewDecoder(r.Body).Decode(form); err != nil {
		app.handleErrorFormDecoding(err, ErrK8sDecode, w)
		return
	}

	form.PopulateK8sOptions(app.repo.User)

	// validate the form
	if err := app.validator.Struct(form); err != nil {
		app.handleErrorFormValidation(err, ErrK8sValidate, w)
		return
	}

	// create a new agent
	var agent *kubernetes.Agent
	var err error

	if app.testing {
		agent = app.TestAgents.K8sAgent
	} else {
		agent, err = kubernetes.GetAgentOutOfClusterConfig(form.K8sOptions)
	}

	namespaces, err := agent.ListNamespaces()

	if err != nil {
		app.handleErrorFormValidation(err, ErrK8sValidate, w)
		return
	}

	if err := json.NewEncoder(w).Encode(namespaces); err != nil {
		app.handleErrorFormDecoding(err, ErrK8sDecode, w)
		return
	}
}
