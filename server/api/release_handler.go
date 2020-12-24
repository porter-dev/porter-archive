package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"strings"

	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/templater/parser"
	"helm.sh/helm/v3/pkg/release"

	"github.com/go-chi/chi"
	"github.com/porter-dev/porter/internal/forms"
	"github.com/porter-dev/porter/internal/helm"
	"github.com/porter-dev/porter/internal/helm/grapher"
	"github.com/porter-dev/porter/internal/kubernetes"
	"github.com/porter-dev/porter/internal/repository"
)

// Enumeration of release API error codes, represented as int64
const (
	ErrReleaseDecode ErrorCode = iota + 600
	ErrReleaseValidateFields
	ErrReleaseReadData
	ErrReleaseDeploy
)

// HandleListReleases retrieves a list of releases for a cluster
// with various filter options
func (app *App) HandleListReleases(w http.ResponseWriter, r *http.Request) {
	form := &forms.ListReleaseForm{
		ReleaseForm: &forms.ReleaseForm{
			Form: &helm.Form{
				Repo: app.Repo,
			},
		},
		ListFilter: &helm.ListFilter{},
	}

	agent, err := app.getAgentFromQueryParams(
		w,
		r,
		form.ReleaseForm,
		form.ReleaseForm.PopulateHelmOptionsFromQueryParams,
		form.PopulateListFromQueryParams,
	)

	// errors are handled in app.getAgentFromQueryParams
	if err != nil {
		return
	}

	releases, err := agent.ListReleases(form.Namespace, form.ListFilter)

	if err != nil {
		app.handleErrorRead(err, ErrReleaseReadData, w)
		return
	}

	if err := json.NewEncoder(w).Encode(releases); err != nil {
		app.handleErrorFormDecoding(err, ErrReleaseDecode, w)
		return
	}
}

// PorterRelease is a helm release with a form attached
type PorterRelease struct {
	*release.Release
	Form *models.FormYAML `json:"form"`
}

// HandleGetRelease retrieves a single release based on a name and revision
func (app *App) HandleGetRelease(w http.ResponseWriter, r *http.Request) {
	name := chi.URLParam(r, "name")
	revision, err := strconv.ParseUint(chi.URLParam(r, "revision"), 0, 64)

	form := &forms.GetReleaseForm{
		ReleaseForm: &forms.ReleaseForm{
			Form: &helm.Form{
				Repo: app.Repo,
			},
		},
		Name:     name,
		Revision: int(revision),
	}

	agent, err := app.getAgentFromQueryParams(
		w,
		r,
		form.ReleaseForm,
		form.ReleaseForm.PopulateHelmOptionsFromQueryParams,
	)

	// errors are handled in app.getAgentFromQueryParams
	if err != nil {
		return
	}

	release, err := agent.GetRelease(form.Name, form.Revision)

	if err != nil {
		app.sendExternalError(err, http.StatusNotFound, HTTPError{
			Code:   ErrReleaseReadData,
			Errors: []string{"release not found"},
		}, w)

		return
	}

	// get the filter options
	k8sForm := &forms.K8sForm{
		OutOfClusterConfig: &kubernetes.OutOfClusterConfig{
			Repo: app.Repo,
		},
	}

	vals, err := url.ParseQuery(r.URL.RawQuery)

	if err != nil {
		app.handleErrorFormDecoding(err, ErrReleaseDecode, w)
		return
	}

	k8sForm.PopulateK8sOptionsFromQueryParams(vals, app.Repo.Cluster)

	// validate the form
	if err := app.validator.Struct(k8sForm); err != nil {
		app.handleErrorFormValidation(err, ErrK8sValidate, w)
		return
	}

	// create a new dynamic client
	dynClient, err := kubernetes.GetDynamicClientOutOfClusterConfig(k8sForm.OutOfClusterConfig)

	if err != nil {
		app.handleErrorFormDecoding(err, ErrReleaseDecode, w)
		return
	}

	parserDef := &parser.ClientConfigDefault{
		DynamicClient: dynClient,
		HelmChart:     release.Chart,
		HelmRelease:   release,
	}

	res := &PorterRelease{release, nil}

	for _, file := range release.Chart.Files {
		if strings.Contains(file.Name, "form.yaml") {
			formYAML, err := parser.FormYAMLFromBytes(parserDef, file.Data, "")

			if err != nil {
				break
			}

			res.Form = formYAML
			break
		}
	}

	if err := json.NewEncoder(w).Encode(res); err != nil {
		app.handleErrorFormDecoding(err, ErrReleaseDecode, w)
		return
	}
}

// HandleGetReleaseComponents retrieves kubernetes objects listed in a release identified by name and revision
func (app *App) HandleGetReleaseComponents(w http.ResponseWriter, r *http.Request) {
	name := chi.URLParam(r, "name")
	revision, err := strconv.ParseUint(chi.URLParam(r, "revision"), 0, 64)

	form := &forms.GetReleaseForm{
		ReleaseForm: &forms.ReleaseForm{
			Form: &helm.Form{
				Repo: app.Repo,
			},
		},
		Name:     name,
		Revision: int(revision),
	}

	agent, err := app.getAgentFromQueryParams(
		w,
		r,
		form.ReleaseForm,
		form.ReleaseForm.PopulateHelmOptionsFromQueryParams,
	)

	// errors are handled in app.getAgentFromQueryParams
	if err != nil {
		return
	}

	release, err := agent.GetRelease(form.Name, form.Revision)

	if err != nil {
		app.sendExternalError(err, http.StatusNotFound, HTTPError{
			Code:   ErrReleaseReadData,
			Errors: []string{"release not found"},
		}, w)

		return
	}

	yamlArr := grapher.ImportMultiDocYAML([]byte(release.Manifest))
	objects := grapher.ParseObjs(yamlArr)

	parsed := grapher.ParsedObjs{
		Objects: objects,
	}

	parsed.GetControlRel()
	parsed.GetLabelRel()
	parsed.GetSpecRel()

	if err := json.NewEncoder(w).Encode(parsed); err != nil {
		app.handleErrorFormDecoding(err, ErrReleaseDecode, w)
		return
	}
}

// HandleGetReleaseControllers retrieves controllers that belong to a release.
// Used to display status of charts.
func (app *App) HandleGetReleaseControllers(w http.ResponseWriter, r *http.Request) {
	name := chi.URLParam(r, "name")
	revision, err := strconv.ParseUint(chi.URLParam(r, "revision"), 0, 64)

	form := &forms.GetReleaseForm{
		ReleaseForm: &forms.ReleaseForm{
			Form: &helm.Form{
				Repo: app.Repo,
			},
		},
		Name:     name,
		Revision: int(revision),
	}

	agent, err := app.getAgentFromQueryParams(
		w,
		r,
		form.ReleaseForm,
		form.ReleaseForm.PopulateHelmOptionsFromQueryParams,
	)

	// errors are handled in app.getAgentFromQueryParams
	if err != nil {
		return
	}

	release, err := agent.GetRelease(form.Name, form.Revision)

	if err != nil {
		app.sendExternalError(err, http.StatusNotFound, HTTPError{
			Code:   ErrReleaseReadData,
			Errors: []string{"release not found"},
		}, w)

		return
	}

	vals, err := url.ParseQuery(r.URL.RawQuery)

	if err != nil {
		app.handleErrorFormDecoding(err, ErrReleaseDecode, w)
		return
	}

	// get the filter options
	k8sForm := &forms.K8sForm{
		OutOfClusterConfig: &kubernetes.OutOfClusterConfig{
			Repo: app.Repo,
		},
	}

	k8sForm.PopulateK8sOptionsFromQueryParams(vals, app.Repo.Cluster)

	// validate the form
	if err := app.validator.Struct(k8sForm); err != nil {
		app.handleErrorFormValidation(err, ErrK8sValidate, w)
		return
	}

	// create a new kubernetes agent
	var k8sAgent *kubernetes.Agent

	if app.ServerConf.IsTesting {
		k8sAgent = app.TestAgents.K8sAgent
	} else {
		k8sAgent, err = kubernetes.GetAgentOutOfClusterConfig(k8sForm.OutOfClusterConfig)
	}

	yamlArr := grapher.ImportMultiDocYAML([]byte(release.Manifest))
	controllers := grapher.ParseControllers(yamlArr)
	retrievedControllers := []interface{}{}

	// get current status of each controller
	// TODO: refactor with type assertion
	for _, c := range controllers {
		c.Namespace = form.ReleaseForm.Form.Namespace
		switch c.Kind {
		case "Deployment":
			rc, err := k8sAgent.GetDeployment(c)

			if err != nil {
				app.handleErrorDataRead(err, w)
				return
			}

			rc.Kind = c.Kind
			retrievedControllers = append(retrievedControllers, rc)
		case "StatefulSet":
			rc, err := k8sAgent.GetStatefulSet(c)

			if err != nil {
				app.handleErrorDataRead(err, w)
				return
			}

			rc.Kind = c.Kind
			retrievedControllers = append(retrievedControllers, rc)
		case "DaemonSet":
			rc, err := k8sAgent.GetDaemonSet(c)

			if err != nil {
				app.handleErrorDataRead(err, w)
				return
			}

			rc.Kind = c.Kind
			retrievedControllers = append(retrievedControllers, rc)
		case "ReplicaSet":
			rc, err := k8sAgent.GetReplicaSet(c)

			if err != nil {
				app.handleErrorDataRead(err, w)
				return
			}

			rc.Kind = c.Kind
			retrievedControllers = append(retrievedControllers, rc)
		}
	}

	if err := json.NewEncoder(w).Encode(retrievedControllers); err != nil {
		app.handleErrorFormDecoding(err, ErrReleaseDecode, w)
		return
	}
}

// HandleListReleaseHistory retrieves a history of releases based on a release name
func (app *App) HandleListReleaseHistory(w http.ResponseWriter, r *http.Request) {
	name := chi.URLParam(r, "name")

	form := &forms.ListReleaseHistoryForm{
		ReleaseForm: &forms.ReleaseForm{
			Form: &helm.Form{
				Repo: app.Repo,
			},
		},
		Name: name,
	}

	agent, err := app.getAgentFromQueryParams(
		w,
		r,
		form.ReleaseForm,
		form.ReleaseForm.PopulateHelmOptionsFromQueryParams,
	)

	// errors are handled in app.getAgentFromQueryParams
	if err != nil {
		return
	}

	release, err := agent.GetReleaseHistory(form.Name)

	if err != nil {
		app.sendExternalError(err, http.StatusNotFound, HTTPError{
			Code:   ErrReleaseReadData,
			Errors: []string{"release not found"},
		}, w)

		return
	}

	if err := json.NewEncoder(w).Encode(release); err != nil {
		app.handleErrorFormDecoding(err, ErrReleaseDecode, w)
		return
	}
}

// HandleGetReleaseToken retrieves the webhook token of a specific release.
func (app *App) HandleGetReleaseToken(w http.ResponseWriter, r *http.Request) {
	name := chi.URLParam(r, "name")

	vals, err := url.ParseQuery(r.URL.RawQuery)
	namespace := vals["namespace"][0]

	release, err := app.Repo.Release.ReadRelease(name, namespace)

	if err != nil {
		app.sendExternalError(err, http.StatusInternalServerError, HTTPError{
			Code:   ErrReleaseReadData,
			Errors: []string{"release not found"},
		}, w)
	}

	releaseExt := release.Externalize()

	if err := json.NewEncoder(w).Encode(releaseExt); err != nil {
		app.handleErrorFormDecoding(err, ErrReleaseDecode, w)
		return
	}
}

// HandleUpgradeRelease upgrades a release with new values.yaml
func (app *App) HandleUpgradeRelease(w http.ResponseWriter, r *http.Request) {
	name := chi.URLParam(r, "name")

	vals, err := url.ParseQuery(r.URL.RawQuery)

	if err != nil {
		app.handleErrorFormDecoding(err, ErrReleaseDecode, w)
		return
	}

	form := &forms.UpgradeReleaseForm{
		ReleaseForm: &forms.ReleaseForm{
			Form: &helm.Form{
				Repo: app.Repo,
			},
		},
		Name: name,
	}

	form.ReleaseForm.PopulateHelmOptionsFromQueryParams(
		vals,
		app.Repo.Cluster,
	)

	if err := json.NewDecoder(r.Body).Decode(form); err != nil {
		app.handleErrorFormDecoding(err, ErrUserDecode, w)
		return
	}

	agent, err := app.getAgentFromReleaseForm(
		w,
		r,
		form.ReleaseForm,
	)

	// errors are handled in app.getAgentFromBodyParams
	if err != nil {
		return
	}

	_, err = agent.UpgradeRelease(form.Name, form.Values)

	if err != nil {
		app.sendExternalError(err, http.StatusInternalServerError, HTTPError{
			Code:   ErrReleaseDeploy,
			Errors: []string{"error upgrading release " + err.Error()},
		}, w)

		return
	}

	w.WriteHeader(http.StatusOK)
}

// HandleReleaseDeployHook upgrades a release with new image commit
func (app *App) HandleReleaseDeployHook(w http.ResponseWriter, r *http.Request) {
	name := chi.URLParam(r, "name")
	vals, err := url.ParseQuery(r.URL.RawQuery)

	commit := vals["commit"][0]
	repository := vals["repository"][0]

	if err != nil {
		app.handleErrorFormDecoding(err, ErrReleaseDecode, w)
		return
	}

	form := &forms.UpgradeReleaseForm{
		ReleaseForm: &forms.ReleaseForm{
			Form: &helm.Form{
				Repo: app.Repo,
			},
		},
		Name: name,
	}

	form.ReleaseForm.PopulateHelmOptionsFromQueryParams(
		vals,
		app.Repo.Cluster,
	)

	if err := json.NewDecoder(r.Body).Decode(form); err != nil {
		app.handleErrorFormDecoding(err, ErrUserDecode, w)
		return
	}

	agent, err := app.getAgentFromReleaseForm(
		w,
		r,
		form.ReleaseForm,
	)

	// errors are handled in app.getAgentFromBodyParams
	if err != nil {
		return
	}

	image := map[string]interface{}{}
	image["repository"] = repository
	image["tag"] = commit

	newval := map[string]interface{}{}
	newval["image"] = image

	_, err = agent.UpgradeReleaseByValues(form.Name, newval)

	if err != nil {
		app.sendExternalError(err, http.StatusInternalServerError, HTTPError{
			Code:   ErrReleaseDeploy,
			Errors: []string{"error upgrading release " + err.Error()},
		}, w)

		return
	}

	w.WriteHeader(http.StatusOK)
}

// HandleReleaseDeployWebhook upgrades a release when a chart specific webhook is called.
func (app *App) HandleReleaseDeployWebhook(w http.ResponseWriter, r *http.Request) {
	token := chi.URLParam(r, "token")

	// retrieve release by token
	release, err := app.Repo.Release.ReadReleaseByWebhookToken(token)

	if err != nil {
		app.sendExternalError(err, http.StatusInternalServerError, HTTPError{
			Code:   ErrReleaseReadData,
			Errors: []string{"release not found with given webhook"},
		}, w)

		return
	}

	params := map[string][]string{}
	params["cluster_id"] = []string{fmt.Sprint(release.ClusterID)}
	params["storage"] = []string{"secret"}
	params["namespace"] = []string{release.Namespace}

	vals, err := url.ParseQuery(r.URL.RawQuery)

	commit := vals["commit"][0]
	repository := vals["repository"][0]

	if err != nil {
		app.handleErrorFormDecoding(err, ErrReleaseDecode, w)
		return
	}

	form := &forms.UpgradeReleaseForm{
		ReleaseForm: &forms.ReleaseForm{
			Form: &helm.Form{
				Repo: app.Repo,
			},
		},
		Name: release.Name,
	}

	form.ReleaseForm.PopulateHelmOptionsFromQueryParams(
		params,
		app.Repo.Cluster,
	)

	if err := json.NewDecoder(r.Body).Decode(form); err != nil {
		app.handleErrorFormDecoding(err, ErrUserDecode, w)
		return
	}

	agent, err := app.getAgentFromReleaseForm(
		w,
		r,
		form.ReleaseForm,
	)

	// errors are handled in app.getAgentFromBodyParams
	if err != nil {
		return
	}

	image := map[string]interface{}{}
	image["repository"] = repository
	image["tag"] = commit

	newval := map[string]interface{}{}
	newval["image"] = image

	_, err = agent.UpgradeReleaseByValues(form.Name, newval)

	if err != nil {
		app.sendExternalError(err, http.StatusInternalServerError, HTTPError{
			Code:   ErrReleaseDeploy,
			Errors: []string{"error upgrading release " + err.Error()},
		}, w)

		return
	}

	w.WriteHeader(http.StatusOK)
}

// HandleRollbackRelease rolls a release back to a specified revision
func (app *App) HandleRollbackRelease(w http.ResponseWriter, r *http.Request) {
	name := chi.URLParam(r, "name")

	vals, err := url.ParseQuery(r.URL.RawQuery)

	if err != nil {
		app.handleErrorFormDecoding(err, ErrReleaseDecode, w)
		return
	}

	form := &forms.RollbackReleaseForm{
		ReleaseForm: &forms.ReleaseForm{
			Form: &helm.Form{
				Repo: app.Repo,
			},
		},
		Name: name,
	}

	form.ReleaseForm.PopulateHelmOptionsFromQueryParams(
		vals,
		app.Repo.Cluster,
	)

	if err := json.NewDecoder(r.Body).Decode(form); err != nil {
		app.handleErrorFormDecoding(err, ErrUserDecode, w)
		return
	}

	agent, err := app.getAgentFromReleaseForm(
		w,
		r,
		form.ReleaseForm,
	)

	// errors are handled in app.getAgentFromBodyParams
	if err != nil {
		return
	}

	err = agent.RollbackRelease(form.Name, form.Revision)

	if err != nil {
		app.sendExternalError(err, http.StatusInternalServerError, HTTPError{
			Code:   ErrReleaseDeploy,
			Errors: []string{"error rolling back release " + err.Error()},
		}, w)

		return
	}

	w.WriteHeader(http.StatusOK)
}

// ------------------------ Release handler helper functions ------------------------ //

// getAgentFromQueryParams uses the query params to populate a form, and then
// passes that form to the underlying app.getAgentFromReleaseForm to create a new
// Helm agent.
func (app *App) getAgentFromQueryParams(
	w http.ResponseWriter,
	r *http.Request,
	form *forms.ReleaseForm,
	// populate uses the query params to populate a form
	populate ...func(vals url.Values, repo repository.ClusterRepository) error,
) (*helm.Agent, error) {
	vals, err := url.ParseQuery(r.URL.RawQuery)

	if err != nil {
		app.handleErrorFormDecoding(err, ErrReleaseDecode, w)
		return nil, err
	}

	for _, f := range populate {
		err := f(vals, app.Repo.Cluster)

		if err != nil {
			return nil, err
		}
	}

	return app.getAgentFromReleaseForm(w, r, form)
}

// getAgentFromReleaseForm uses a non-validated form to construct a new Helm agent based on
// the userID found in the session and the options required by the Helm agent.
func (app *App) getAgentFromReleaseForm(
	w http.ResponseWriter,
	r *http.Request,
	form *forms.ReleaseForm,
) (*helm.Agent, error) {
	var err error

	// validate the form
	if err := app.validator.Struct(form); err != nil {
		app.handleErrorFormValidation(err, ErrReleaseValidateFields, w)
		return nil, err
	}

	// create a new agent
	var agent *helm.Agent

	if app.ServerConf.IsTesting {
		agent = app.TestAgents.HelmAgent
	} else {
		agent, err = helm.GetAgentOutOfClusterConfig(form.Form, app.Logger)
	}

	return agent, err
}
