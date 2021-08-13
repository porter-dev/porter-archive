package api

import (
	"net/http"
	"net/url"
	"strconv"

	"github.com/go-chi/chi"
	"github.com/porter-dev/porter/internal/auth/token"
	"github.com/porter-dev/porter/internal/forms"
	"github.com/porter-dev/porter/internal/helm"
	"github.com/porter-dev/porter/internal/helm/loader"
	"github.com/porter-dev/porter/internal/kubernetes"
)

// HandleDeployAgent deploys the agent in the Porter cluster
func (app *App) HandleDeployAgent(w http.ResponseWriter, r *http.Request) {
	projID, err := strconv.ParseUint(chi.URLParam(r, "project_id"), 0, 64)

	if err != nil || projID == 0 {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	chart, err := loader.LoadChartPublic(
		app.ServerConf.DefaultAddonHelmRepoURL,
		"porter-agent",
		"latest",
	)

	if err != nil {
		app.handleErrorFormDecoding(err, ErrReleaseDecode, w)
		return
	}

	vals, err := url.ParseQuery(r.URL.RawQuery)

	if err != nil {
		app.handleErrorFormDecoding(err, ErrReleaseDecode, w)
		return
	}

	releaseForm := &forms.ReleaseForm{
		Form: &helm.Form{
			Repo:              app.Repo,
			DigitalOceanOAuth: app.DOConf,
			Storage:           "secret",
			Namespace:         "porter-agent-system",
		},
	}

	releaseForm.PopulateHelmOptionsFromQueryParams(
		vals,
		app.Repo.Cluster,
	)

	agent, err := app.getAgentFromReleaseForm(
		w,
		r,
		releaseForm,
	)

	if err != nil {
		app.handleErrorFormDecoding(err, ErrUserDecode, w)
		return
	}

	// create namespace if not exists
	_, err = agent.K8sAgent.CreateNamespace("porter-agent-system")

	if err != nil {
		app.handleErrorFormDecoding(err, ErrUserDecode, w)
		return
	}

	// add api token to values
	userID, err := app.getUserIDFromRequest(r)

	if err != nil {
		app.handleErrorFormDecoding(err, ErrUserDecode, w)
		return
	}

	jwt, _ := token.GetTokenForAPI(userID, uint(projID))

	encoded, err := jwt.EncodeToken(&token.TokenGeneratorConf{
		TokenSecret: app.ServerConf.TokenGeneratorSecret,
	})

	if err != nil {
		app.handleErrorInternal(err, w)
		return
	}

	porterAgentValues := map[string]interface{}{
		"secret": map[string]interface{}{
			"token": encoded,
		},
		"config": map[string]interface{}{
			"projectID":  projID,
			"clusterID":  releaseForm.Cluster.ID,
			"porterHost": app.ServerConf.ServerURL,
		},
	}

	conf := &helm.InstallChartConfig{
		Chart:     chart,
		Name:      "porter-agent",
		Namespace: "porter-agent-system",
		Cluster:   releaseForm.Cluster,
		Repo:      *app.Repo,
		Values:    porterAgentValues,
	}

	_, err = agent.InstallChart(conf, app.DOConf)

	if err != nil {
		app.sendExternalError(err, http.StatusInternalServerError, HTTPError{
			Code:   ErrReleaseDeploy,
			Errors: []string{"error installing a new chart: " + err.Error()},
		}, w)

		return
	}

	w.WriteHeader(http.StatusOK)
}

// HandleDetectPorterAgentInstalled detects if the agent is installed in the cluster
func (app *App) HandleDetectPorterAgentInstalled(w http.ResponseWriter, r *http.Request) {
	vals, err := url.ParseQuery(r.URL.RawQuery)

	if err != nil {
		app.handleErrorFormDecoding(err, ErrReleaseDecode, w)
		return
	}

	// get the filter options
	form := &forms.K8sForm{
		OutOfClusterConfig: &kubernetes.OutOfClusterConfig{
			Repo:              app.Repo,
			DigitalOceanOAuth: app.DOConf,
		},
	}

	form.PopulateK8sOptionsFromQueryParams(vals, app.Repo.Cluster)

	// validate the form
	if err := app.validator.Struct(form); err != nil {
		app.handleErrorFormValidation(err, ErrK8sValidate, w)
		return
	}

	// create a new agent
	var agent *kubernetes.Agent

	if app.ServerConf.IsTesting {
		agent = app.TestAgents.K8sAgent
	} else {
		agent, err = kubernetes.GetAgentOutOfClusterConfig(form.OutOfClusterConfig)
	}

	// detect prometheus service
	porterAgent, err := agent.GetPorterAgent()

	if err != nil || porterAgent == nil {
		http.NotFound(w, r)
		return
	}

	w.WriteHeader(http.StatusOK)
	return
}
