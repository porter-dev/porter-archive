package api

import (
	"encoding/json"
	"net/http"
	"net/url"

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
	session, err := app.store.Get(r, app.cookieName)

	if err != nil {
		app.handleErrorFormDecoding(err, ErrReleaseDecode, w)
		return
	}

	vals, err := url.ParseQuery(r.URL.RawQuery)

	if err != nil {
		app.handleErrorFormDecoding(err, ErrReleaseDecode, w)
		return
	}

	// get the filter options
	form := &forms.K8sForm{
		OutOfClusterConfig: &kubernetes.OutOfClusterConfig{},
	}
	form.PopulateK8sOptionsFromQueryParams(vals)

	if sessID, ok := session.Values["user_id"].(uint); ok {
		form.PopulateK8sOptionsFromUserID(sessID, app.repo.User)
	}

	// validate the form
	if err := app.validator.Struct(form); err != nil {
		app.handleErrorFormValidation(err, ErrK8sValidate, w)
		return
	}

	// create a new agent
	var agent *kubernetes.Agent

	if app.testing {
		agent = app.TestAgents.K8sAgent
	} else {
		agent, err = kubernetes.GetAgentOutOfClusterConfig(form.OutOfClusterConfig)
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
