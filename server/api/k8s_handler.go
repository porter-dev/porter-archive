package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strconv"

	"github.com/go-chi/chi"
	"github.com/gorilla/schema"
	"github.com/gorilla/websocket"
	"github.com/porter-dev/porter/internal/forms"
	"github.com/porter-dev/porter/internal/kubernetes"
	"github.com/porter-dev/porter/internal/kubernetes/nodes"
	"github.com/porter-dev/porter/internal/kubernetes/prometheus"
	v1 "k8s.io/api/core/v1"
	"k8s.io/client-go/tools/clientcmd"
)

// Enumeration of k8s API error codes, represented as int64
const (
	ErrK8sDecode ErrorCode = iota + 600
	ErrK8sValidate
	ErrEnvDecode
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
}

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

	namespaces, err := agent.ListNamespaces()

	if err != nil {
		app.handleErrorDataRead(err, w)
		return
	}

	if err := json.NewEncoder(w).Encode(namespaces); err != nil {
		app.handleErrorFormDecoding(err, ErrK8sDecode, w)
		return
	}
}

// HandleCreateNamespace creates a new namespace given the name.
func (app *App) HandleCreateNamespace(w http.ResponseWriter, r *http.Request) {
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

	ns := &forms.NamespaceForm{}

	if err := json.NewDecoder(r.Body).Decode(ns); err != nil {
		app.handleErrorFormDecoding(err, ErrUserDecode, w)
		return
	}

	namespace, err := agent.CreateNamespace(ns.Name)

	if err != nil {
		app.handleErrorInternal(err, w)
		return
	}

	if err := json.NewEncoder(w).Encode(namespace); err != nil {
		app.handleErrorFormDecoding(err, ErrK8sDecode, w)
		return
	}

	w.WriteHeader(http.StatusOK)
	return
}

// HandleDeleteNamespace deletes a namespace given the name.
func (app *App) HandleDeleteNamespace(w http.ResponseWriter, r *http.Request) {
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

	if err != nil {
		app.handleErrorInternal(err, w)
		return
	}

	namespace := &forms.NamespaceForm{
		Name: vals.Get("name"),
	}

	err = agent.DeleteNamespace(namespace.Name)

	if err != nil {
		app.handleErrorInternal(err, w)
		return
	}

	w.WriteHeader(http.StatusOK)
	return
}

// HandleListPodEvents retrieves all events tied to a pod.
func (app *App) HandleListPodEvents(w http.ResponseWriter, r *http.Request) {
	vals, err := url.ParseQuery(r.URL.RawQuery)

	// get path parameters
	namespace := chi.URLParam(r, "namespace")
	name := chi.URLParam(r, "name")

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

	events, err := agent.ListEvents(name, namespace)

	if err != nil {
		app.handleErrorDataRead(err, w)
		return
	}

	if err := json.NewEncoder(w).Encode(events); err != nil {
		app.handleErrorFormDecoding(err, ErrK8sDecode, w)
		return
	}
}

func createConfigMap(agent *kubernetes.Agent, configMap *forms.ConfigMapForm) error {
	secretData := make(map[string][]byte)

	for key, rawValue := range configMap.SecretEnvVariables {
		// encodedValue := base64.StdEncoding.EncodeToString([]byte(rawValue))

		// if err != nil {
		// 	app.handleErrorInternal(err, w)
		// 	return
		// }

		secretData[key] = []byte(rawValue)
	}

	// create secret first
	if _, err := agent.CreateLinkedSecret(configMap.Name, configMap.Namespace, configMap.Name, secretData); err != nil {
		return err
	}

	// add all secret env variables to configmap with value PORTERSECRET_${configmap_name}
	for key, _ := range configMap.SecretEnvVariables {
		configMap.EnvVariables[key] = fmt.Sprintf("PORTERSECRET_%s", configMap.Name)
	}

	if _, err := agent.CreateConfigMap(configMap.Name, configMap.Namespace, configMap.EnvVariables); err != nil {
		return err
	}

	return nil
}

// HandleCreateConfigMap creates a configmap (and secret) given the name, namespace and variables.
func (app *App) HandleCreateConfigMap(w http.ResponseWriter, r *http.Request) {
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

	configMap := &forms.ConfigMapForm{}

	if err := json.NewDecoder(r.Body).Decode(configMap); err != nil {
		app.handleErrorFormDecoding(err, ErrUserDecode, w)
		return
	}

	if err := createConfigMap(agent, configMap); err != nil {
		app.handleErrorInternal(err, w)
		return
	}

	if err := json.NewEncoder(w).Encode(configMap); err != nil {
		app.handleErrorFormDecoding(err, ErrEnvDecode, w)
		return
	}

	w.WriteHeader(http.StatusOK)
	return
}

// HandleListConfigMaps lists all configmaps in a namespace.
func (app *App) HandleListConfigMaps(w http.ResponseWriter, r *http.Request) {
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

	configMaps, err := agent.ListConfigMaps(vals["namespace"][0])

	if err != nil {
		app.handleErrorInternal(err, w)
		return
	}

	if err := json.NewEncoder(w).Encode(configMaps); err != nil {
		app.handleErrorFormDecoding(err, ErrEnvDecode, w)
		return
	}

	w.WriteHeader(http.StatusOK)
	return
}

// HandleGetConfigMap retreives the configmap given the name and namespace.
func (app *App) HandleGetConfigMap(w http.ResponseWriter, r *http.Request) {
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

	configMap, err := agent.GetConfigMap(vals["name"][0], vals["namespace"][0])

	if err != nil {
		app.handleErrorInternal(err, w)
		return
	}

	if err := json.NewEncoder(w).Encode(configMap); err != nil {
		app.handleErrorFormDecoding(err, ErrEnvDecode, w)
		return
	}

	w.WriteHeader(http.StatusOK)
	return
}

func deleteConfigMap(agent *kubernetes.Agent, name string, namespace string) error {
	if err := agent.DeleteLinkedSecret(name, namespace); err != nil {
		return err
	}

	if err := agent.DeleteConfigMap(name, namespace); err != nil {
		return err
	}

	return nil
}

// HandleDeleteConfigMap deletes the configmap (and secret) given the name and namespace.
func (app *App) HandleDeleteConfigMap(w http.ResponseWriter, r *http.Request) {
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

	if err := deleteConfigMap(agent, vals["name"][0], vals["namespace"][0]); err != nil {
		app.handleErrorInternal(err, w)
		return
	}

	w.WriteHeader(http.StatusOK)
	return
}

// HandleUpdateConfigMap updates the configmap (and secret) given the name, namespace and variables.
func (app *App) HandleUpdateConfigMap(w http.ResponseWriter, r *http.Request) {
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

	configMap := &forms.ConfigMapForm{}

	if err := json.NewDecoder(r.Body).Decode(configMap); err != nil {
		app.handleErrorFormDecoding(err, ErrEnvDecode, w)
		return
	}

	secretData := make(map[string][]byte)

	for key, rawValue := range configMap.SecretEnvVariables {
		// encodedValue, err := base64.StdEncoding.DecodeString(rawValue)

		// if err != nil {
		// 	app.handleErrorInternal(err, w)
		// 	return
		// }

		secretData[key] = []byte(rawValue)
	}

	// create secret first
	err = agent.UpdateLinkedSecret(configMap.Name, configMap.Namespace, configMap.Name, secretData)

	if err != nil {
		app.handleErrorInternal(err, w)
		return
	}

	// add all secret env variables to configmap with value PORTERSECRET_${configmap_name}
	for key, val := range configMap.SecretEnvVariables {
		// if val is empty and key does not exist in configmap already, set to empty
		if _, found := configMap.EnvVariables[key]; val == "" && !found {
			configMap.EnvVariables[key] = ""
		} else if val != "" {
			configMap.EnvVariables[key] = fmt.Sprintf("PORTERSECRET_%s", configMap.Name)
		}
	}

	err = agent.UpdateConfigMap(configMap.Name, configMap.Namespace, configMap.EnvVariables)

	if err != nil {
		app.handleErrorInternal(err, w)
		return
	}

	if err := json.NewEncoder(w).Encode(configMap); err != nil {
		app.handleErrorFormDecoding(err, ErrEnvDecode, w)
		return
	}

	w.WriteHeader(http.StatusOK)
	return
}

// HandleRenameConfigMap renames the configmap name given the current name, namespace and new name.
func (app *App) HandleRenameConfigMap(w http.ResponseWriter, r *http.Request) {
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

	renameConfigMapForm := &forms.RenameConfigMapForm{}

	if err := json.NewDecoder(r.Body).Decode(renameConfigMapForm); err != nil {
		app.handleErrorFormDecoding(err, ErrEnvDecode, w)
		return
	}

	configMap, err := agent.GetConfigMap(renameConfigMapForm.Name, renameConfigMapForm.Namespace)

	if err != nil {
		app.handleErrorInternal(err, w)
		return
	}

	secret, err := agent.GetSecret(configMap.Name, configMap.Namespace)

	if err != nil {
		app.handleErrorInternal(err, w)
		return
	}

	var decodedSecretData = make(map[string]string)
	for k, v := range secret.Data {
		decodedSecretData[k] = string(v)
	}

	newConfigMap := &forms.ConfigMapForm{
		Name:               renameConfigMapForm.NewName,
		Namespace:          configMap.Namespace,
		EnvVariables:       configMap.Data,
		SecretEnvVariables: decodedSecretData,
	}

	if newConfigMap.Name == configMap.Name {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	if err := createConfigMap(agent, newConfigMap); err != nil {
		app.handleErrorInternal(err, w)
		return
	}

	if err := deleteConfigMap(agent, configMap.Name, configMap.Namespace); err != nil {
		app.handleErrorInternal(err, w)
		return
	}

	w.WriteHeader(http.StatusOK)
	return
}

// HandleGetPodLogs returns real-time logs of the pod via websockets
// TODO: Refactor repeated calls.
func (app *App) HandleGetPodLogs(w http.ResponseWriter, r *http.Request) {
	// get session to retrieve correct kubeconfig
	_, err := app.Store.Get(r, app.ServerConf.CookieName)

	// get path parameters
	namespace := chi.URLParam(r, "namespace")
	podName := chi.URLParam(r, "name")

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

	upgrader.CheckOrigin = func(r *http.Request) bool { return true }

	// upgrade to websocket.
	conn, err := upgrader.Upgrade(w, r, nil)

	if err != nil {
		app.handleErrorUpgradeWebsocket(err, w)
	}

	err = agent.GetPodLogs(namespace, podName, conn)

	if err != nil {
		app.handleErrorWebsocketWrite(err, w)
		return
	}
}

// HandleDeletePod deletes the pod given the name and namespace.
func (app *App) HandleDeletePod(w http.ResponseWriter, r *http.Request) {
	// get path parameters
	namespace := chi.URLParam(r, "namespace")
	name := chi.URLParam(r, "name")

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

	err = agent.DeletePod(namespace, name)

	if err != nil {
		app.handleErrorInternal(err, w)
		return
	}

	w.WriteHeader(http.StatusOK)
	return
}

// HandleGetIngress returns the ingress object given the name and namespace.
func (app *App) HandleGetIngress(w http.ResponseWriter, r *http.Request) {

	// get session to retrieve correct kubeconfig
	_, err := app.Store.Get(r, app.ServerConf.CookieName)

	// get path parameters
	namespace := chi.URLParam(r, "namespace")
	name := chi.URLParam(r, "name")

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

	ingress, err := agent.GetIngress(namespace, name)

	if err != nil {
		app.handleErrorFormDecoding(err, ErrReleaseDecode, w)
		return
	}

	if err := json.NewEncoder(w).Encode(ingress); err != nil {
		app.handleErrorFormDecoding(err, ErrK8sDecode, w)
		return
	}
}

// HandleListPods returns all pods that match the given selectors
// TODO: Refactor repeated calls.
func (app *App) HandleListPods(w http.ResponseWriter, r *http.Request) {

	// get session to retrieve correct kubeconfig
	_, err := app.Store.Get(r, app.ServerConf.CookieName)

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

	namespace := vals.Get("namespace")
	pods := []v1.Pod{}
	for _, selector := range vals["selectors"] {
		podsList, err := agent.GetPodsByLabel(selector, namespace)

		if err != nil {
			app.handleErrorFormValidation(err, ErrK8sValidate, w)
			return
		}

		for _, pod := range podsList.Items {
			pods = append(pods, pod)
		}
	}

	if err := json.NewEncoder(w).Encode(pods); err != nil {
		app.handleErrorFormDecoding(err, ErrK8sDecode, w)
		return
	}
}

// HandleListJobsByChart lists all jobs belonging to a specific Helm chart
func (app *App) HandleListJobsByChart(w http.ResponseWriter, r *http.Request) {
	// get path parameters
	namespace := chi.URLParam(r, "namespace")
	chart := chi.URLParam(r, "chart")
	releaseName := chi.URLParam(r, "release_name")

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

	jobs, err := agent.ListJobsByLabel(namespace, kubernetes.Label{
		Key: "helm.sh/chart",
		Val: chart,
	}, kubernetes.Label{
		Key: "meta.helm.sh/release-name",
		Val: releaseName,
	})

	if err != nil {
		app.handleErrorFormDecoding(err, ErrReleaseDecode, w)
		return
	}

	if err := json.NewEncoder(w).Encode(jobs); err != nil {
		app.handleErrorFormDecoding(err, ErrK8sDecode, w)
		return
	}
}

// HandleDeleteJob deletes the job given the name and namespace.
func (app *App) HandleDeleteJob(w http.ResponseWriter, r *http.Request) {
	// get path parameters
	namespace := chi.URLParam(r, "namespace")
	name := chi.URLParam(r, "name")

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

	err = agent.DeleteJob(name, namespace)

	if err != nil {
		app.handleErrorInternal(err, w)
		return
	}

	w.WriteHeader(http.StatusOK)
	return
}

// HandleStopJob stops a running job
func (app *App) HandleStopJob(w http.ResponseWriter, r *http.Request) {
	// get path parameters
	namespace := chi.URLParam(r, "namespace")
	name := chi.URLParam(r, "name")

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

	err = agent.StopJobWithJobSidecar(namespace, name)

	if err != nil {
		app.sendExternalError(err, 500, HTTPError{
			Code:   500,
			Errors: []string{err.Error()},
		}, w)
		return
	}

	w.WriteHeader(http.StatusOK)
	return
}

// HandleListJobPods lists all pods belonging to a specific job
func (app *App) HandleListJobPods(w http.ResponseWriter, r *http.Request) {
	// get path parameters
	namespace := chi.URLParam(r, "namespace")
	name := chi.URLParam(r, "name")

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

	pods, err := agent.GetJobPods(namespace, name)

	if err != nil {
		app.handleErrorFormDecoding(err, ErrReleaseDecode, w)
		return
	}

	if err := json.NewEncoder(w).Encode(pods); err != nil {
		app.handleErrorFormDecoding(err, ErrK8sDecode, w)
		return
	}
}

// HandleStreamControllerStatus test calls
// TODO: Refactor repeated calls.
func (app *App) HandleStreamControllerStatus(w http.ResponseWriter, r *http.Request) {
	vals, err := url.ParseQuery(r.URL.RawQuery)

	if err != nil {
		app.handleErrorFormDecoding(err, ErrReleaseDecode, w)
		return
	}

	// get session to retrieve correct kubeconfig
	_, err = app.Store.Get(r, app.ServerConf.CookieName)

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

	upgrader.CheckOrigin = func(r *http.Request) bool { return true }

	// upgrade to websocket.
	conn, err := upgrader.Upgrade(w, r, nil)

	if err != nil {
		app.handleErrorUpgradeWebsocket(err, w)
	}

	// get path parameters
	kind := chi.URLParam(r, "kind")

	selectors := ""
	if vals["selectors"] != nil {
		selectors = vals["selectors"][0]
	}
	err = agent.StreamControllerStatus(conn, kind, selectors)

	if err != nil {
		app.handleErrorWebsocketWrite(err, w)
		return
	}
}

func (app *App) HandleStreamHelmReleases(w http.ResponseWriter, r *http.Request) {
	vals, err := url.ParseQuery(r.URL.RawQuery)

	if err != nil {
		app.handleErrorFormDecoding(err, ErrReleaseDecode, w)
		return
	}

	// get session to retrieve correct kubeconfig
	_, err = app.Store.Get(r, app.ServerConf.CookieName)

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

	upgrader.CheckOrigin = func(r *http.Request) bool { return true }

	// upgrade to websocket.
	conn, err := upgrader.Upgrade(w, r, nil)

	if err != nil {
		app.handleErrorUpgradeWebsocket(err, w)
	}

	selectors := ""
	if vals["selectors"] != nil {
		selectors = vals["selectors"][0]
	}

	var chartList []string

	if vals["charts"] != nil {
		chartList = vals["charts"]
	}

	err = agent.StreamHelmReleases(conn, chartList, selectors)

	if err != nil {
		app.handleErrorWebsocketWrite(err, w)
		return
	}
}

// HandleDetectPrometheusInstalled detects a prometheus installation in the target cluster
func (app *App) HandleDetectPrometheusInstalled(w http.ResponseWriter, r *http.Request) {
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
	_, found, err := prometheus.GetPrometheusService(agent.Clientset)

	if !found {
		http.NotFound(w, r)
		return
	}

	w.WriteHeader(http.StatusOK)
	return
}

// HandleListNGINXIngresses lists all NGINX ingresses in a target cluster
func (app *App) HandleListNGINXIngresses(w http.ResponseWriter, r *http.Request) {
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

	res, err := prometheus.GetIngressesWithNGINXAnnotation(agent.Clientset)

	if err != nil {
		app.handleErrorInternal(err, w)
		return
	}

	w.WriteHeader(http.StatusOK)

	if err := json.NewEncoder(w).Encode(res); err != nil {
		app.handleErrorFormDecoding(err, ErrK8sDecode, w)
		return
	}
}

func (app *App) HandleGetPodMetrics(w http.ResponseWriter, r *http.Request) {
	vals, err := url.ParseQuery(r.URL.RawQuery)

	if err != nil {
		app.handleErrorFormDecoding(err, ErrReleaseDecode, w)
		return
	}

	// get the filter options
	form := &forms.MetricsQueryForm{
		K8sForm: &forms.K8sForm{
			OutOfClusterConfig: &kubernetes.OutOfClusterConfig{
				Repo:              app.Repo,
				DigitalOceanOAuth: app.DOConf,
			},
		},
		QueryOpts: &prometheus.QueryOpts{},
	}

	form.K8sForm.PopulateK8sOptionsFromQueryParams(vals, app.Repo.Cluster)

	// decode from JSON to form value
	decoder := schema.NewDecoder()
	decoder.IgnoreUnknownKeys(true)

	if err := decoder.Decode(form.QueryOpts, vals); err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
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

	// get prometheus service
	promSvc, found, err := prometheus.GetPrometheusService(agent.Clientset)

	if err != nil {
		app.handleErrorInternal(err, w)
		return
	}

	if !found {
		app.handleErrorInternal(err, w)
		return
	}

	rawQuery, err := prometheus.QueryPrometheus(agent.Clientset, promSvc, form.QueryOpts)

	if err != nil {
		app.handleErrorInternal(err, w)
		return
	}

	fmt.Fprint(w, string(rawQuery))
}

type KubeconfigResponse struct {
	Kubeconfig []byte `json:"kubeconfig"`
}

func (app *App) HandleGetTemporaryKubeconfig(w http.ResponseWriter, r *http.Request) {
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

	// get the API config
	apiConf, err := form.OutOfClusterConfig.CreateRawConfigFromCluster()

	if err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	bytes, err := clientcmd.Write(*apiConf)
	res := &KubeconfigResponse{
		Kubeconfig: bytes,
	}

	if err := json.NewEncoder(w).Encode(res); err != nil {
		app.handleErrorFormDecoding(err, ErrK8sDecode, w)
		return
	}
}

func (app *App) HandleListNodes(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseUint(chi.URLParam(r, "cluster_id"), 0, 64)

	if err != nil || id == 0 {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	cluster, err := app.Repo.Cluster.ReadCluster(uint(id))

	if err != nil {
		app.handleErrorRead(err, ErrProjectDataRead, w)
		return
	}

	form := &forms.K8sForm{
		OutOfClusterConfig: &kubernetes.OutOfClusterConfig{
			Repo:              app.Repo,
			DigitalOceanOAuth: app.DOConf,
			Cluster:           cluster,
		},
	}

	var agent *kubernetes.Agent

	if app.ServerConf.IsTesting {
		agent = app.TestAgents.K8sAgent
	} else {
		agent, _ = kubernetes.GetAgentOutOfClusterConfig(form.OutOfClusterConfig)
	}

	nodeWithUsageList := nodes.GetNodesUsage(agent.Clientset)

	w.WriteHeader(http.StatusOK)

	if err := json.NewEncoder(w).Encode(nodeWithUsageList); err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}
}

func (app *App) HandleGetNode(w http.ResponseWriter, r *http.Request) {
	cluster_id, err := strconv.ParseUint(chi.URLParam(r, "cluster_id"), 0, 64)
	node_name := chi.URLParam(r, "node_name")

	if err != nil || cluster_id == 0 {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	cluster, err := app.Repo.Cluster.ReadCluster(uint(cluster_id))

	if err != nil {
		app.handleErrorRead(err, ErrProjectDataRead, w)
		return
	}

	form := &forms.K8sForm{
		OutOfClusterConfig: &kubernetes.OutOfClusterConfig{
			Repo:              app.Repo,
			DigitalOceanOAuth: app.DOConf,
			Cluster:           cluster,
		},
	}

	var agent *kubernetes.Agent

	if app.ServerConf.IsTesting {
		agent = app.TestAgents.K8sAgent
	} else {
		agent, _ = kubernetes.GetAgentOutOfClusterConfig(form.OutOfClusterConfig)
	}

	nodeWithUsageData := nodes.DescribeNode(agent.Clientset, node_name)

	w.WriteHeader(http.StatusOK)

	if err := json.NewEncoder(w).Encode(nodeWithUsageData); err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}
}
