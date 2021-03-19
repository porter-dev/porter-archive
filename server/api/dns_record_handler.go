package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"

	"github.com/porter-dev/porter/internal/forms"
	"github.com/porter-dev/porter/internal/kubernetes"
	"github.com/porter-dev/porter/internal/kubernetes/domain"
)

// HandleCreateProjectCluster creates a new cluster
func (app *App) HandleCreateDNSRecord(w http.ResponseWriter, r *http.Request) {
	vals, err := url.ParseQuery(r.URL.RawQuery)

	if err != nil {
		app.handleErrorFormDecoding(err, ErrReleaseDecode, w)
		return
	}

	// get the filter options
	form := &forms.CreateDomainForm{
		K8sForm: &forms.K8sForm{
			OutOfClusterConfig: &kubernetes.OutOfClusterConfig{
				Repo:              app.Repo,
				DigitalOceanOAuth: app.DOConf,
			},
		},
	}

	form.PopulateK8sOptionsFromQueryParams(vals, app.Repo.Cluster)

	if err := json.NewDecoder(r.Body).Decode(form); err != nil {
		app.handleErrorFormDecoding(err, ErrUserDecode, w)
		return
	}

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

	endpoint, found, err := domain.GetNGINXIngressServiceIP(agent.Clientset)

	if !found {
		app.handleErrorInternal(fmt.Errorf("target cluster does not have nginx ingress"), w)
		return
	}

	createDomain := domain.CreateDNSRecordConfig{
		ReleaseName: form.ReleaseName,
		RootDomain:  app.ServerConf.AppRootDomain,
		Endpoint:    endpoint,
	}

	record := createDomain.NewDNSRecordForEndpoint()

	record, err = app.Repo.DNSRecord.CreateDNSRecord(record)

	if err != nil {
		app.handleErrorDataWrite(err, w)
		return
	}

	// launch provisioning destruction pod
	inClusterAgent, err := kubernetes.GetAgentInClusterConfig()

	if err != nil {
		app.handleErrorDataRead(err, w)
		return
	}

	_record := domain.DNSRecord(*record)

	err = _record.CreateDomain(inClusterAgent.Clientset)

	if err != nil {
		app.handleErrorInternal(err, w)
	}

	w.WriteHeader(http.StatusCreated)

	if err := json.NewEncoder(w).Encode(record.Externalize()); err != nil {
		app.handleErrorFormDecoding(err, ErrK8sDecode, w)
		return
	}
}
