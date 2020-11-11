package api

import (
	"encoding/json"
	"net/http"
	"net/url"
	"time"

	"github.com/porter-dev/porter/internal/kubernetes"
	"github.com/porter-dev/porter/internal/models"

	"github.com/porter-dev/porter/internal/forms"
)

// Enumeration of k8s API error codes, represented as int64
const (
	ErrK8sDecode ErrorCode = iota + 600
	ErrK8sValidate
)

// HandleListNamespaces retrieves a list of namespaces
func (app *App) HandleListNamespaces(w http.ResponseWriter, r *http.Request) {
	vals, err := url.ParseQuery(r.URL.RawQuery)

	if err != nil {
		app.handleErrorFormDecoding(err, ErrReleaseDecode, w)
		return
	}

	// get the filter options
	form := &forms.K8sForm{
		OutOfClusterConfig: &kubernetes.OutOfClusterConfig{
			UpdateTokenCache: app.updateTokenCache,
		},
	}

	form.PopulateK8sOptionsFromQueryParams(vals, app.repo.ServiceAccount)

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

func (app *App) updateTokenCache(token string, expiry time.Time) error {
	_, err := app.repo.ServiceAccount.UpdateServiceAccountTokenCache(
		&models.TokenCache{
			Token:  token,
			Expiry: expiry,
		},
	)

	return err
}
