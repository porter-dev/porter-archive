package kubernetes

import (
	"bufio"
	"bytes"
	"compress/gzip"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"io/ioutil"
	"strconv"
	"strings"
	"sync"
	"time"

	goerrors "errors"

	"github.com/porter-dev/porter/api/server/shared/websocket"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/registry"
	"github.com/porter-dev/porter/internal/repository"
	"golang.org/x/oauth2"

	errors2 "errors"

	"github.com/porter-dev/porter/internal/helm/grapher"
	appsv1 "k8s.io/api/apps/v1"
	batchv1 "k8s.io/api/batch/v1"
	batchv1beta1 "k8s.io/api/batch/v1beta1"
	v1 "k8s.io/api/core/v1"
	v1beta1 "k8s.io/api/extensions/v1beta1"
	netv1 "k8s.io/api/networking/v1"
	netv1beta1 "k8s.io/api/networking/v1beta1"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/fields"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/apimachinery/pkg/watch"
	"k8s.io/cli-runtime/pkg/genericclioptions"
	"k8s.io/client-go/informers"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/cache"
	"k8s.io/client-go/tools/remotecommand"
	"k8s.io/kubectl/pkg/scheme"

	rspb "helm.sh/helm/v3/pkg/release"
)

// Agent is a Kubernetes agent for performing operations that interact with the
// api server
type Agent struct {
	RESTClientGetter genericclioptions.RESTClientGetter
	Clientset        kubernetes.Interface
}

type Message struct {
	EventType string `json:"event_type"`
	Object    interface{}
	Kind      string
}

type ListOptions struct {
	FieldSelector string
}

type AuthError struct{}

func (e *AuthError) Error() string {
	return "Unauthorized error"
}

// UpdateClientset updates the Agent's Clientset (this refreshes auth tokens)
func (a *Agent) UpdateClientset() error {
	restConf, err := a.RESTClientGetter.ToRESTConfig()

	if err != nil {
		return err
	}

	clientset, err := kubernetes.NewForConfig(restConf)

	if err != nil {
		return err
	}

	a.Clientset = clientset

	return nil
}

// CreateConfigMap creates the configmap given the key-value pairs and namespace
func (a *Agent) CreateConfigMap(name string, namespace string, configMap map[string]string) (*v1.ConfigMap, error) {
	return a.Clientset.CoreV1().ConfigMaps(namespace).Create(
		context.TODO(),
		&v1.ConfigMap{
			ObjectMeta: metav1.ObjectMeta{
				Name:      name,
				Namespace: namespace,
				Labels: map[string]string{
					"porter": "true",
				},
			},
			Data: configMap,
		},
		metav1.CreateOptions{},
	)
}

func (a *Agent) CreateVersionedConfigMap(name, namespace string, version uint, configMap map[string]string, apps ...string) (*v1.ConfigMap, error) {
	return a.Clientset.CoreV1().ConfigMaps(namespace).Create(
		context.TODO(),
		&v1.ConfigMap{
			ObjectMeta: metav1.ObjectMeta{
				Name:      fmt.Sprintf("%s.v%d", name, version),
				Namespace: namespace,
				Labels: map[string]string{
					"owner":    "porter",
					"envgroup": name,
					"version":  fmt.Sprintf("%d", version),
				},
				Annotations: map[string]string{
					PorterAppAnnotationName: strings.Join(apps, ","),
				},
			},
			Data: configMap,
		},
		metav1.CreateOptions{},
	)
}

const PorterAppAnnotationName = "porter.run/apps"

func (a *Agent) AddApplicationToVersionedConfigMap(cm *v1.ConfigMap, appName string) (*v1.ConfigMap, error) {
	annons := cm.Annotations

	if annons == nil {
		annons = make(map[string]string)
	}

	appAnnon, appAnnonExists := annons[PorterAppAnnotationName]

	if !appAnnonExists || appAnnon == "" {
		annons[PorterAppAnnotationName] = appName
	} else {
		appStrArr := strings.Split(appAnnon, ",")
		foundApp := false

		for _, appStr := range appStrArr {
			if appStr == appName {
				foundApp = true
			}
		}

		if !foundApp {
			annons[PorterAppAnnotationName] = fmt.Sprintf("%s,%s", appAnnon, appName)
		}
	}

	cm.SetAnnotations(annons)

	return a.Clientset.CoreV1().ConfigMaps(cm.Namespace).Update(
		context.TODO(),
		cm,
		metav1.UpdateOptions{},
	)
}

func (a *Agent) RemoveApplicationFromVersionedConfigMap(cm *v1.ConfigMap, appName string) (*v1.ConfigMap, error) {
	annons := cm.Annotations

	if annons == nil {
		annons = make(map[string]string)
	}

	appAnn, appAnnExists := annons[PorterAppAnnotationName]

	if !appAnnExists {
		return nil, IsNotFoundError
	}

	appStrArr := strings.Split(appAnn, ",")
	newStrArr := make([]string, 0)

	for _, appStr := range appStrArr {
		if appStr != appName {
			newStrArr = append(newStrArr, appStr)
		}
	}

	annons[PorterAppAnnotationName] = strings.Join(newStrArr, ",")

	cm.SetAnnotations(annons)

	return a.Clientset.CoreV1().ConfigMaps(cm.Namespace).Update(
		context.TODO(),
		cm,
		metav1.UpdateOptions{},
	)
}

func (a *Agent) CreateLinkedVersionedSecret(name, namespace, cmName string, version uint, data map[string][]byte) (*v1.Secret, error) {
	return a.Clientset.CoreV1().Secrets(namespace).Create(
		context.TODO(),
		&v1.Secret{
			ObjectMeta: metav1.ObjectMeta{
				Name:      fmt.Sprintf("%s.v%d", name, version),
				Namespace: namespace,
				Labels: map[string]string{
					"owner":     "porter",
					"envgroup":  name,
					"version":   fmt.Sprintf("%d", version),
					"configmap": cmName,
				},
			},
			Data: data,
		},
		metav1.CreateOptions{},
	)
}

// CreateLinkedSecret creates a secret given the key-value pairs and namespace. Values are
// base64 encoded
func (a *Agent) CreateLinkedSecret(name, namespace, cmName string, data map[string][]byte) (*v1.Secret, error) {
	return a.Clientset.CoreV1().Secrets(namespace).Create(
		context.TODO(),
		&v1.Secret{
			ObjectMeta: metav1.ObjectMeta{
				Name:      name,
				Namespace: namespace,
				Labels: map[string]string{
					"porter":    "true",
					"configmap": cmName,
				},
			},
			Data: data,
		},
		metav1.CreateOptions{},
	)
}

type mergeConfigMapData struct {
	Data map[string]*string `json:"data"`
}

// UpdateConfigMap updates the configmap given its name and namespace
func (a *Agent) UpdateConfigMap(name string, namespace string, configMap map[string]string) (*v1.ConfigMap, error) {
	cmData := make(map[string]*string)

	for key, val := range configMap {
		valCopy := val
		cmData[key] = &valCopy

		if len(val) == 0 {
			cmData[key] = nil
		}
	}

	mergeCM := &mergeConfigMapData{
		Data: cmData,
	}

	patchBytes, err := json.Marshal(mergeCM)

	if err != nil {
		return nil, err
	}

	return a.Clientset.CoreV1().ConfigMaps(namespace).Patch(
		context.Background(),
		name,
		types.MergePatchType,
		patchBytes,
		metav1.PatchOptions{},
	)
}

type mergeLinkedSecretData struct {
	Data map[string]*[]byte `json:"data"`
}

// UpdateLinkedSecret updates the secret given its name and namespace
func (a *Agent) UpdateLinkedSecret(name, namespace, cmName string, data map[string][]byte) error {
	secretData := make(map[string]*[]byte)

	for key, val := range data {
		valCopy := val
		secretData[key] = &valCopy

		if len(val) == 0 {
			secretData[key] = nil
		}
	}

	mergeSecret := &mergeLinkedSecretData{
		Data: secretData,
	}

	patchBytes, err := json.Marshal(mergeSecret)

	if err != nil {
		return err
	}

	_, err = a.Clientset.CoreV1().Secrets(namespace).Patch(
		context.TODO(),
		name,
		types.MergePatchType,
		patchBytes,
		metav1.PatchOptions{},
	)

	return err
}

// DeleteConfigMap deletes the configmap given its name and namespace
func (a *Agent) DeleteConfigMap(name string, namespace string) error {
	return a.Clientset.CoreV1().ConfigMaps(namespace).Delete(
		context.TODO(),
		name,
		metav1.DeleteOptions{},
	)
}

// DeleteLinkedSecret deletes the secret given its name and namespace
func (a *Agent) DeleteLinkedSecret(name, namespace string) error {
	return a.Clientset.CoreV1().Secrets(namespace).Delete(
		context.TODO(),
		name,
		metav1.DeleteOptions{},
	)
}

func (a *Agent) ListVersionedConfigMaps(name string, namespace string) ([]v1.ConfigMap, error) {
	listResp, err := a.Clientset.CoreV1().ConfigMaps(namespace).List(
		context.Background(),
		metav1.ListOptions{
			LabelSelector: fmt.Sprintf("envgroup=%s", name),
		},
	)

	if err != nil {
		return nil, err
	}

	return listResp.Items, nil
}

func (a *Agent) DeleteVersionedConfigMap(name string, namespace string) error {
	return a.Clientset.CoreV1().ConfigMaps(namespace).DeleteCollection(
		context.Background(),
		metav1.DeleteOptions{},
		metav1.ListOptions{
			LabelSelector: fmt.Sprintf("envgroup=%s", name),
		},
	)
}

func (a *Agent) DeleteVersionedSecret(name string, namespace string) error {
	return a.Clientset.CoreV1().Secrets(namespace).DeleteCollection(
		context.Background(),
		metav1.DeleteOptions{},
		metav1.ListOptions{
			LabelSelector: fmt.Sprintf("envgroup=%s", name),
		},
	)
}

func (a *Agent) ListAllVersionedConfigMaps(namespace string) ([]v1.ConfigMap, error) {
	listResp, err := a.Clientset.CoreV1().ConfigMaps(namespace).List(
		context.Background(),
		metav1.ListOptions{
			LabelSelector: fmt.Sprintf("envgroup"),
		},
	)

	if err != nil {
		return nil, err
	}

	// only keep the latest version for each configmap
	latestMap := make(map[string]v1.ConfigMap)

	for _, configmap := range listResp.Items {
		egName, egNameExists := configmap.Labels["envgroup"]

		if !egNameExists {
			continue
		}

		id := fmt.Sprintf("%s/%s", configmap.Namespace, egName)

		if currLatest, exists := latestMap[id]; exists {
			// get version
			currVersionStr, currVersionExists := currLatest.Labels["version"]
			versionStr, versionExists := configmap.Labels["version"]

			if versionExists && currVersionExists {
				currVersion, currErr := strconv.Atoi(currVersionStr)
				version, err := strconv.Atoi(versionStr)

				if currErr == nil && err == nil && currVersion < version {
					latestMap[id] = configmap
				}
			}
		} else {
			latestMap[id] = configmap
		}
	}

	res := make([]v1.ConfigMap, 0)

	for _, cm := range latestMap {
		res = append(res, cm)
	}

	return res, nil
}

// GetConfigMap retrieves the configmap given its name and namespace
func (a *Agent) GetConfigMap(name string, namespace string) (*v1.ConfigMap, error) {
	return a.Clientset.CoreV1().ConfigMaps(namespace).Get(
		context.TODO(),
		name,
		metav1.GetOptions{},
	)
}

func (a *Agent) GetVersionedConfigMap(name, namespace string, version uint) (*v1.ConfigMap, error) {
	listResp, err := a.Clientset.CoreV1().ConfigMaps(namespace).List(
		context.Background(),
		metav1.ListOptions{
			LabelSelector: fmt.Sprintf("envgroup=%s,version=%d", name, version),
		},
	)

	if err != nil {
		return nil, err
	}

	if listResp.Items == nil || len(listResp.Items) == 0 {
		return nil, IsNotFoundError
	}

	// if the length of the list is greater than 1, return an error -- this shouldn't happen
	if len(listResp.Items) > 1 {
		return nil, fmt.Errorf("multiple configmaps found while searching for %s/%s and version %d", namespace, name, version)
	}

	return &listResp.Items[0], nil
}

func (a *Agent) GetLatestVersionedConfigMap(name, namespace string) (*v1.ConfigMap, uint, error) {
	listResp, err := a.Clientset.CoreV1().ConfigMaps(namespace).List(
		context.Background(),
		metav1.ListOptions{
			LabelSelector: fmt.Sprintf("envgroup=%s", name),
		},
	)

	if err != nil {
		return nil, 0, err
	}

	if listResp.Items == nil || len(listResp.Items) == 0 {
		return nil, 0, IsNotFoundError
	}

	// iterate through the configmaps and get the greatest version
	var res *v1.ConfigMap
	var latestVersion uint

	for _, configmap := range listResp.Items {
		if res == nil {
			versionStr, versionExists := configmap.Labels["version"]

			if !versionExists {
				continue
			}

			version, err := strconv.Atoi(versionStr)

			if err != nil {
				continue
			}

			latestV := configmap
			res = &latestV
			latestVersion = uint(version)
		} else {
			// get version
			versionStr, versionExists := configmap.Labels["version"]
			currVersionStr, currVersionExists := res.Labels["version"]

			if versionExists && currVersionExists {
				currVersion, currErr := strconv.Atoi(currVersionStr)
				version, err := strconv.Atoi(versionStr)
				if currErr == nil && err == nil && currVersion < version {
					latestV := configmap
					res = &latestV
					latestVersion = uint(version)
				}
			}
		}

	}

	if res == nil {
		return nil, 0, IsNotFoundError
	}

	return res, latestVersion, nil
}

func (a *Agent) GetLatestVersionedSecret(name, namespace string) (*v1.Secret, uint, error) {
	listResp, err := a.Clientset.CoreV1().Secrets(namespace).List(
		context.Background(),
		metav1.ListOptions{
			LabelSelector: fmt.Sprintf("envgroup=%s", name),
		},
	)

	if err != nil {
		return nil, 0, err
	}

	if listResp.Items == nil || len(listResp.Items) == 0 {
		return nil, 0, IsNotFoundError
	}

	// iterate through the configmaps and get the greatest version
	var res *v1.Secret
	var latestVersion uint

	for _, secret := range listResp.Items {
		if res == nil {
			versionStr, versionExists := secret.Labels["version"]

			if !versionExists {
				continue
			}

			version, err := strconv.Atoi(versionStr)

			if err != nil {
				continue
			}

			latestV := secret
			res = &latestV
			latestVersion = uint(version)
		} else {
			// get version
			versionStr, versionExists := secret.Labels["version"]
			currVersionStr, currVersionExists := res.Labels["version"]

			if versionExists && currVersionExists {
				currVersion, currErr := strconv.Atoi(currVersionStr)
				version, err := strconv.Atoi(versionStr)
				if currErr == nil && err == nil && currVersion < version {
					latestV := secret
					res = &latestV
					latestVersion = uint(version)
				}
			}
		}

	}

	if res == nil {
		return nil, 0, IsNotFoundError
	}

	return res, latestVersion, nil
}

// GetSecret retrieves the secret given its name and namespace
func (a *Agent) GetSecret(name string, namespace string) (*v1.Secret, error) {
	return a.Clientset.CoreV1().Secrets(namespace).Get(
		context.TODO(),
		name,
		metav1.GetOptions{},
	)
}

// ListConfigMaps simply lists namespaces
func (a *Agent) ListConfigMaps(namespace string) (*v1.ConfigMapList, error) {
	return a.Clientset.CoreV1().ConfigMaps(namespace).List(
		context.TODO(),
		metav1.ListOptions{
			LabelSelector: "porter",
		},
	)
}

// ListEvents lists the events of a given object.
func (a *Agent) ListEvents(name string, namespace string) (*v1.EventList, error) {
	return a.Clientset.CoreV1().Events(namespace).List(
		context.TODO(),
		metav1.ListOptions{
			FieldSelector: fmt.Sprintf("involvedObject.name=%s,involvedObject.namespace=%s", name, namespace),
		},
	)
}

// ListNamespaces simply lists namespaces
func (a *Agent) ListNamespaces() (*v1.NamespaceList, error) {
	return a.Clientset.CoreV1().Namespaces().List(
		context.TODO(),
		metav1.ListOptions{},
	)
}

// CreateNamespace creates a namespace with the given name.
func (a *Agent) CreateNamespace(name string, labels map[string]string) (*v1.Namespace, error) {
	// check if namespace exists
	checkNS, err := a.Clientset.CoreV1().Namespaces().Get(
		context.TODO(),
		name,
		metav1.GetOptions{},
	)

	if err == nil && checkNS != nil {
		if checkNS.Status.Phase == v1.NamespaceTerminating {
			// edge case for when the same namespace was previously created
			// but was deleted and is currently in the "Terminating" phase

			// let us wait for a maximum of 10 seconds
			timeNow := time.Now().Add(10 * time.Second)
			stillTerminating := true
			for {
				_, err := a.Clientset.CoreV1().Namespaces().Get(
					context.TODO(),
					name,
					metav1.GetOptions{},
				)

				if err != nil && errors.IsNotFound(err) {
					stillTerminating = false
					break
				}

				time.Sleep(time.Second)

				if time.Now().After(timeNow) {
					break
				}
			}

			if stillTerminating {
				// the namespace has been in the "Terminating" phase
				return nil, fmt.Errorf("cannot create namespace %s, stuck in \"Terminating\" phase", name)
			}
		} else {
			return checkNS, nil
		}
	}

	namespace := &v1.Namespace{
		ObjectMeta: metav1.ObjectMeta{
			Name: name,
		},
	}

	if len(labels) > 0 {
		namespace.SetLabels(labels)
	}

	return a.Clientset.CoreV1().Namespaces().Create(
		context.TODO(),
		namespace,
		metav1.CreateOptions{},
	)
}

// GetNamespace gets the namespace given the name
func (a *Agent) GetNamespace(name string) (*v1.Namespace, error) {
	ns, err := a.Clientset.CoreV1().Namespaces().Get(
		context.Background(),
		name,
		metav1.GetOptions{},
	)

	if err != nil {
		return nil, err
	}

	return ns, nil
}

// DeleteNamespace deletes the namespace given the name.
func (a *Agent) DeleteNamespace(name string) error {
	// check if namespace exists
	checkNS, err := a.Clientset.CoreV1().Namespaces().Get(
		context.TODO(),
		name,
		metav1.GetOptions{},
	)

	// if the namespace is not found, don't return an error.
	if err != nil && errors.IsNotFound(err) {
		return nil
	}

	// if the namespace was found but is in the "Terminating" phase
	// we should ignore it and not return an error
	if checkNS != nil && checkNS.Status.Phase == v1.NamespaceTerminating {
		return nil
	}

	return a.Clientset.CoreV1().Namespaces().Delete(
		context.TODO(),
		name,
		metav1.DeleteOptions{},
	)
}

func (a *Agent) GetPorterAgent() (*appsv1.Deployment, error) {
	depl, err := a.Clientset.AppsV1().Deployments("porter-agent-system").Get(
		context.TODO(),
		"porter-agent-controller-manager",
		metav1.GetOptions{},
	)

	if err != nil && errors.IsNotFound(err) {
		return nil, IsNotFoundError
	}

	return depl, err
}

// ListJobsByLabel lists jobs in a namespace matching a label
type Label struct {
	Key string
	Val string
}

func (a *Agent) ListJobsByLabel(namespace string, labels ...Label) ([]batchv1.Job, error) {
	selectors := make([]string, 0)

	for _, label := range labels {
		selectors = append(selectors, fmt.Sprintf("%s=%s", label.Key, label.Val))
	}

	resp, err := a.Clientset.BatchV1().Jobs(namespace).List(
		context.TODO(),
		metav1.ListOptions{
			LabelSelector: strings.Join(selectors, ","),
		},
	)

	if err != nil {
		return nil, err
	}

	return resp.Items, nil
}

// StreamJobs streams a list of jobs to the websocket writer, closing the connection once all jobs have been sent
func (a *Agent) StreamJobs(namespace string, selectors string, rw *websocket.WebsocketSafeReadWriter) error {
	run := func() error {
		errorchan := make(chan error)
		ctx, cancel := context.WithCancel(context.Background())
		defer cancel()

		var wg sync.WaitGroup
		var once sync.Once
		var err error

		wg.Add(2)

		go func() {
			wg.Wait()
			close(errorchan)
		}()

		go func() {
			defer func() {
				if r := recover(); r != nil {
					// TODO: add method to alert on panic
					return
				}
			}()

			// listens for websocket closing handshake
			defer wg.Done()

			for {
				if _, _, err := rw.ReadMessage(); err != nil {
					errorchan <- nil
					return
				}
			}
		}()

		go func() {
			defer func() {
				if r := recover(); r != nil {
					// TODO: add method to alert on panic
					return
				}
			}()

			// listens for websocket closing handshake
			defer wg.Done()

			continueVal := ""

			for {
				if ctx.Err() != nil {
					errorchan <- nil
					return
				}

				labelSelector := "meta.helm.sh/release-name"

				if selectors != "" {
					labelSelector = selectors
				}

				jobs, err := a.Clientset.BatchV1().Jobs(namespace).List(
					ctx,
					metav1.ListOptions{
						Limit:         100,
						Continue:      continueVal,
						LabelSelector: labelSelector,
					},
				)

				if err != nil {
					errorchan <- err
					return
				}

				for _, job := range jobs.Items {
					err := rw.WriteJSON(job)

					if err != nil {
						errorchan <- err
						return
					}
				}

				if jobs.Continue == "" {
					// we have reached the end of the list of jobs
					break
				} else {
					// start pagination
					continueVal = jobs.Continue
				}
			}

			// at this point, we can return the status finished
			err := rw.WriteJSON(map[string]interface{}{
				"streamStatus": "finished",
			})

			errorchan <- err
		}()

		for err = range errorchan {
			once.Do(func() {
				rw.Close()
				cancel()
			})
		}

		return err
	}

	return a.RunWebsocketTask(run)
}

// DeleteJob deletes the job in the given name and namespace.
func (a *Agent) DeleteJob(name, namespace string) error {
	return a.Clientset.BatchV1().Jobs(namespace).Delete(
		context.TODO(),
		name,
		metav1.DeleteOptions{},
	)
}

// GetJobPods lists all pods belonging to a job in a namespace
func (a *Agent) GetJobPods(namespace, jobName string) ([]v1.Pod, error) {
	resp, err := a.Clientset.CoreV1().Pods(namespace).List(
		context.TODO(),
		metav1.ListOptions{
			LabelSelector: fmt.Sprintf("%s=%s", "job-name", jobName),
		},
	)

	if err != nil {
		return nil, err
	}

	return resp.Items, nil
}

// GetIngress gets ingress given the name and namespace
func (a *Agent) GetExtensionsV1Beta1Ingress(namespace string, name string) (*v1beta1.Ingress, error) {
	resp, err := a.Clientset.ExtensionsV1beta1().Ingresses(namespace).Get(
		context.TODO(),
		name,
		metav1.GetOptions{},
	)

	if err != nil && errors.IsNotFound(err) {
		return nil, IsNotFoundError
	} else if err != nil {
		return nil, err
	}

	return resp, nil
}

func (a *Agent) GetNetworkingV1Ingress(namespace string, name string) (*netv1.Ingress, error) {
	resp, err := a.Clientset.NetworkingV1().Ingresses(namespace).Get(
		context.TODO(),
		name,
		metav1.GetOptions{},
	)

	if err != nil && errors.IsNotFound(err) {
		return nil, IsNotFoundError
	} else if err != nil {
		return nil, err
	}

	return resp, nil
}

func (a *Agent) GetNetworkingV1Beta1Ingress(namespace string, name string) (*netv1beta1.Ingress, error) {
	resp, err := a.Clientset.NetworkingV1beta1().Ingresses(namespace).Get(
		context.TODO(),
		name,
		metav1.GetOptions{},
	)

	if err != nil && errors.IsNotFound(err) {
		return nil, IsNotFoundError
	} else if err != nil {
		return nil, err
	}

	return resp, nil
}

var IsNotFoundError = fmt.Errorf("not found")

type BadRequestError struct {
	msg string
}

func (e *BadRequestError) Error() string {
	return e.msg
}

// GetDeployment gets the deployment given the name and namespace
func (a *Agent) GetDeployment(c grapher.Object) (*appsv1.Deployment, error) {
	res, err := a.Clientset.AppsV1().Deployments(c.Namespace).Get(
		context.TODO(),
		c.Name,
		metav1.GetOptions{},
	)

	if err != nil && errors.IsNotFound(err) {
		return nil, IsNotFoundError
	} else if err != nil {
		return nil, err
	}

	res.Kind = c.Kind

	return res, nil
}

// GetStatefulSet gets the statefulset given the name and namespace
func (a *Agent) GetStatefulSet(c grapher.Object) (*appsv1.StatefulSet, error) {
	res, err := a.Clientset.AppsV1().StatefulSets(c.Namespace).Get(
		context.TODO(),
		c.Name,
		metav1.GetOptions{},
	)

	if err != nil && errors.IsNotFound(err) {
		return nil, IsNotFoundError
	} else if err != nil {
		return nil, err
	}

	res.Kind = c.Kind

	return res, nil
}

// GetReplicaSet gets the replicaset given the name and namespace
func (a *Agent) GetReplicaSet(c grapher.Object) (*appsv1.ReplicaSet, error) {
	res, err := a.Clientset.AppsV1().ReplicaSets(c.Namespace).Get(
		context.TODO(),
		c.Name,
		metav1.GetOptions{},
	)

	if err != nil && errors.IsNotFound(err) {
		return nil, IsNotFoundError
	} else if err != nil {
		return nil, err
	}

	res.Kind = c.Kind

	return res, nil
}

// GetDaemonSet gets the daemonset by name and namespace
func (a *Agent) GetDaemonSet(c grapher.Object) (*appsv1.DaemonSet, error) {
	res, err := a.Clientset.AppsV1().DaemonSets(c.Namespace).Get(
		context.TODO(),
		c.Name,
		metav1.GetOptions{},
	)

	if err != nil && errors.IsNotFound(err) {
		return nil, IsNotFoundError
	} else if err != nil {
		return nil, err
	}

	res.Kind = c.Kind

	return res, nil
}

// GetJob gets the job by name and namespace
func (a *Agent) GetJob(c grapher.Object) (*batchv1.Job, error) {
	res, err := a.Clientset.BatchV1().Jobs(c.Namespace).Get(
		context.TODO(),
		c.Name,
		metav1.GetOptions{},
	)

	if err != nil && errors.IsNotFound(err) {
		return nil, IsNotFoundError
	} else if err != nil {
		return nil, err
	}

	res.Kind = c.Kind

	return res, nil
}

// GetCronJob gets the CronJob by name and namespace
func (a *Agent) GetCronJob(c grapher.Object) (*batchv1beta1.CronJob, error) {
	res, err := a.Clientset.BatchV1beta1().CronJobs(c.Namespace).Get(
		context.TODO(),
		c.Name,
		metav1.GetOptions{},
	)

	if err != nil && errors.IsNotFound(err) {
		return nil, IsNotFoundError
	} else if err != nil {
		return nil, err
	}

	res.Kind = c.Kind

	return res, nil
}

// GetPodsByLabel retrieves pods with matching labels
func (a *Agent) GetPodsByLabel(selector string, namespace string) (*v1.PodList, error) {
	// Search in all namespaces for matching pods
	return a.Clientset.CoreV1().Pods(namespace).List(
		context.TODO(),
		metav1.ListOptions{
			LabelSelector: selector,
		},
	)
}

// GetPodByName retrieves a single instance of pod with given name
func (a *Agent) GetPodByName(name string, namespace string) (*v1.Pod, error) {
	// Get pod by name
	pod, err := a.Clientset.CoreV1().Pods(namespace).Get(
		context.TODO(),
		name,
		metav1.GetOptions{},
	)

	if err != nil && errors.IsNotFound(err) {
		return nil, IsNotFoundError
	}

	if err != nil {
		return nil, err
	}

	return pod, nil
}

// DeletePod deletes a pod by name and namespace
func (a *Agent) DeletePod(namespace string, name string) error {
	err := a.Clientset.CoreV1().Pods(namespace).Delete(
		context.TODO(),
		name,
		metav1.DeleteOptions{},
	)

	if err != nil && errors.IsNotFound(err) {
		return IsNotFoundError
	}

	return err
}

// GetPodLogs streams real-time logs from a given pod.
func (a *Agent) GetPodLogs(namespace string, name string, selectedContainer string, rw *websocket.WebsocketSafeReadWriter) error {
	// get the pod to read in the list of contains
	pod, err := a.Clientset.CoreV1().Pods(namespace).Get(
		context.Background(),
		name,
		metav1.GetOptions{},
	)

	if err != nil && errors.IsNotFound(err) {
		return IsNotFoundError
	} else if err != nil {
		return fmt.Errorf("Cannot get logs from pod %s: %s", name, err.Error())
	}

	// see if container is ready and able to open a stream. If not, wait for container
	// to be ready.
	err, _ = a.waitForPod(pod)

	if err != nil && goerrors.Is(err, IsNotFoundError) {
		return IsNotFoundError
	} else if err != nil {
		return fmt.Errorf("Cannot get logs from pod %s: %s", name, err.Error())
	}

	container := pod.Spec.Containers[0].Name

	if len(selectedContainer) > 0 {
		container = selectedContainer
	}

	tails := int64(400)

	// follow logs
	podLogOpts := v1.PodLogOptions{
		Follow:    true,
		TailLines: &tails,
		Container: container,
	}

	req := a.Clientset.CoreV1().Pods(namespace).GetLogs(name, &podLogOpts)

	podLogs, err := req.Stream(context.TODO())

	// in the case of bad request errors, such as if the pod is stuck in "ContainerCreating",
	// we'd like to pass this through to the client.
	if err != nil && errors.IsBadRequest(err) {
		return &BadRequestError{err.Error()}
	} else if err != nil {
		return fmt.Errorf("Cannot open log stream for pod %s: %s", name, err.Error())
	}

	r := bufio.NewReader(podLogs)
	errorchan := make(chan error)

	var wg sync.WaitGroup
	var once sync.Once
	wg.Add(2)

	go func() {
		wg.Wait()
		close(errorchan)
	}()

	go func() {
		defer func() {
			if r := recover(); r != nil {
				// TODO: add method to alert on panic
				return
			}
		}()

		// listens for websocket closing handshake
		defer wg.Done()

		for {
			if _, _, err := rw.ReadMessage(); err != nil {
				errorchan <- nil
				return
			}
		}
	}()

	go func() {
		defer func() {
			if r := recover(); r != nil {
				// TODO: add method to alert on panic
				return
			}
		}()

		defer wg.Done()

		for {
			bytes, err := r.ReadBytes('\n')

			if err != nil {
				errorchan <- err
				return
			}

			if _, writeErr := rw.Write(bytes); writeErr != nil {
				errorchan <- writeErr
				return
			}
		}
	}()

	for err = range errorchan {
		// only call these methods a single time
		once.Do(func() {
			rw.Close()
			podLogs.Close()
		})
	}

	return err
}

// GetPodLogs streams real-time logs from a given pod.
func (a *Agent) GetPreviousPodLogs(namespace string, name string, selectedContainer string) ([]string, error) {
	// get the pod to read in the list of contains
	pod, err := a.Clientset.CoreV1().Pods(namespace).Get(
		context.Background(),
		name,
		metav1.GetOptions{},
	)

	if err != nil && errors.IsNotFound(err) {
		return nil, IsNotFoundError
	} else if err != nil {
		return nil, fmt.Errorf("Cannot get logs from pod %s: %s", name, err.Error())
	}

	container := pod.Spec.Containers[0].Name

	if len(selectedContainer) > 0 {
		container = selectedContainer
	}

	tails := int64(400)

	// follow logs
	podLogOpts := v1.PodLogOptions{
		Follow:    true,
		TailLines: &tails,
		Container: container,
		Previous:  true,
	}

	req := a.Clientset.CoreV1().Pods(namespace).GetLogs(name, &podLogOpts)

	podLogs, err := req.Stream(context.TODO())

	// in the case of bad request errors, such as if the pod is stuck in "ContainerCreating",
	// we'd like to pass this through to the client.
	if err != nil && strings.Contains(err.Error(), "not found") {
		return nil, IsNotFoundError
	}

	if err != nil && errors.IsBadRequest(err) {
		return nil, &BadRequestError{err.Error()}
	} else if err != nil {
		return nil, fmt.Errorf("Cannot open log stream for pod %s: %s", name, err.Error())
	}

	defer podLogs.Close()

	r := bufio.NewReader(podLogs)
	var logs []string

	for {
		line, err := r.ReadString('\n')
		logs = append(logs, line)

		if err == io.EOF {
			break
		} else if err != nil {
			return nil, err
		}
	}

	return logs, nil
}

// StopJobWithJobSidecar sends a termination signal to a job running with a sidecar
func (a *Agent) StopJobWithJobSidecar(namespace, name string) error {
	jobPods, err := a.GetJobPods(namespace, name)

	if err != nil {
		return err
	}

	podName := jobPods[0].ObjectMeta.Name

	restConf, err := a.RESTClientGetter.ToRESTConfig()

	restConf.GroupVersion = &schema.GroupVersion{
		Group:   "api",
		Version: "v1",
	}

	restConf.NegotiatedSerializer = runtime.NewSimpleNegotiatedSerializer(runtime.SerializerInfo{})

	restClient, err := rest.RESTClientFor(restConf)

	if err != nil {
		return err
	}

	req := restClient.Post().
		Resource("pods").
		Name(podName).
		Namespace(namespace).
		SubResource("exec")

	req.Param("command", "./signal.sh")
	req.Param("container", "sidecar")
	req.Param("stdin", "true")
	req.Param("stdout", "false")
	req.Param("tty", "false")

	exec, err := remotecommand.NewSPDYExecutor(restConf, "POST", req.URL())

	if err != nil {
		return err
	}

	return exec.Stream(remotecommand.StreamOptions{
		Tty:   false,
		Stdin: strings.NewReader("./signal.sh"),
	})
}

// RunWebsocketTask will run a websocket task. If the websocket returns an anauthorized error, it will restart
// the task some number of times until failing
func (a *Agent) RunWebsocketTask(task func() error) error {

	lastTime := int64(0)

	for {
		if err := a.UpdateClientset(); err != nil {
			return err
		}

		err := task()

		if err == nil {
			return nil
		}

		if !errors2.Is(err, &AuthError{}) {
			return err
		}

		if time.Now().Unix()-lastTime < 60 { // don't regenerate connection if too many unauthorized errors
			return err
		}

		lastTime = time.Now().Unix()
	}
}

// StreamControllerStatus streams controller status. Supports Deployment, StatefulSet, ReplicaSet, and DaemonSet
// TODO: Support Jobs
func (a *Agent) StreamControllerStatus(kind string, selectors string, rw *websocket.WebsocketSafeReadWriter) error {

	run := func() error {
		// selectors is an array of max length 1. StreamControllerStatus accepts calls without the selectors argument.
		// selectors argument is a single string with comma separated key=value pairs. (e.g. "app=porter,porter=true")
		tweakListOptionsFunc := func(options *metav1.ListOptions) {
			options.LabelSelector = selectors
		}

		factory := informers.NewSharedInformerFactoryWithOptions(
			a.Clientset,
			0,
			informers.WithTweakListOptions(tweakListOptionsFunc),
		)

		var informer cache.SharedInformer

		// Spins up an informer depending on kind. Convert to lowercase for robustness
		switch strings.ToLower(kind) {
		case "deployment":
			informer = factory.Apps().V1().Deployments().Informer()
		case "statefulset":
			informer = factory.Apps().V1().StatefulSets().Informer()
		case "replicaset":
			informer = factory.Apps().V1().ReplicaSets().Informer()
		case "daemonset":
			informer = factory.Apps().V1().DaemonSets().Informer()
		case "job":
			informer = factory.Batch().V1().Jobs().Informer()
		case "cronjob":
			informer = factory.Batch().V1beta1().CronJobs().Informer()
		case "namespace":
			informer = factory.Core().V1().Namespaces().Informer()
		case "pod":
			informer = factory.Core().V1().Pods().Informer()
		}

		stopper := make(chan struct{})
		errorchan := make(chan error)

		var wg sync.WaitGroup
		var once sync.Once
		var err error

		wg.Add(2)

		go func() {
			wg.Wait()
			close(errorchan)
		}()

		go func() {
			defer func() {
				if r := recover(); r != nil {
					// TODO: add method to alert on panic
					return
				}
			}()

			// listens for websocket closing handshake
			defer wg.Done()

			for {
				if _, _, err := rw.ReadMessage(); err != nil {
					errorchan <- nil
					return
				}
			}
		}()

		go func() {
			defer func() {
				if r := recover(); r != nil {
					// TODO: add method to alert on panic
					return
				}
			}()

			// listens for websocket closing handshake
			defer wg.Done()

			informer.SetWatchErrorHandler(func(r *cache.Reflector, err error) {
				if strings.HasSuffix(err.Error(), ": Unauthorized") {
					errorchan <- &AuthError{}
				}
			})

			informer.AddEventHandler(cache.ResourceEventHandlerFuncs{
				UpdateFunc: func(oldObj, newObj interface{}) {
					msg := Message{
						EventType: "UPDATE",
						Object:    newObj,
						Kind:      strings.ToLower(kind),
					}
					err := rw.WriteJSON(msg)

					if err != nil {
						errorchan <- err
					}
				},
				AddFunc: func(obj interface{}) {
					msg := Message{
						EventType: "ADD",
						Object:    obj,
						Kind:      strings.ToLower(kind),
					}

					err := rw.WriteJSON(msg)

					if err != nil {
						errorchan <- err
					}
				},
				DeleteFunc: func(obj interface{}) {
					msg := Message{
						EventType: "DELETE",
						Object:    obj,
						Kind:      strings.ToLower(kind),
					}

					err := rw.WriteJSON(msg)

					if err != nil {
						errorchan <- err
					}
				},
			})

			informer.Run(stopper)
		}()

		for err = range errorchan {
			once.Do(func() {
				close(stopper)
				rw.Close()
			})
		}

		return err
	}

	return a.RunWebsocketTask(run)
}

var b64 = base64.StdEncoding

var magicGzip = []byte{0x1f, 0x8b, 0x08}

func decodeRelease(data string) (*rspb.Release, error) {
	// base64 decode string
	b, err := b64.DecodeString(data)
	if err != nil {
		return nil, err
	}

	// For backwards compatibility with releases that were stored before
	// compression was introduced we skip decompression if the
	// gzip magic header is not found
	if bytes.Equal(b[0:3], magicGzip) {
		r, err := gzip.NewReader(bytes.NewReader(b))
		if err != nil {
			return nil, err
		}
		defer r.Close()
		b2, err := ioutil.ReadAll(r)
		if err != nil {
			return nil, err
		}
		b = b2
	}

	var rls rspb.Release
	// unmarshal release object bytes
	if err := json.Unmarshal(b, &rls); err != nil {
		return nil, err
	}
	return &rls, nil
}

func contains(s []string, str string) bool {
	for _, v := range s {
		if v == str {
			return true
		}
	}

	return false
}

func ParseSecretToHelmRelease(secret v1.Secret, chartList []string) (*rspb.Release, bool, error) {
	if secret.Type != "helm.sh/release.v1" {
		return nil, true, nil
	}

	releaseData, ok := secret.Data["release"]

	if !ok {
		return nil, true, fmt.Errorf("release field not found")
	}

	helm_object, err := decodeRelease(string(releaseData))

	if err != nil {
		return nil, true, err
	}

	if len(chartList) > 0 && !contains(chartList, helm_object.Name) {
		return nil, true, nil
	}

	return helm_object, false, nil
}

func (a *Agent) StreamHelmReleases(namespace string, chartList []string, selectors string, rw *websocket.WebsocketSafeReadWriter) error {
	run := func() error {
		tweakListOptionsFunc := func(options *metav1.ListOptions) {
			options.LabelSelector = selectors
		}

		factory := informers.NewSharedInformerFactoryWithOptions(
			a.Clientset,
			0,
			informers.WithTweakListOptions(tweakListOptionsFunc),
			informers.WithNamespace(namespace),
		)

		informer := factory.Core().V1().Secrets().Informer()

		stopper := make(chan struct{})
		errorchan := make(chan error)

		var wg sync.WaitGroup
		var once sync.Once
		var err error

		wg.Add(2)

		go func() {
			wg.Wait()
			close(errorchan)
		}()

		go func() {
			defer func() {
				if r := recover(); r != nil {
					// TODO: add method to alert on panic
					return
				}
			}()

			// listens for websocket closing handshake
			defer wg.Done()

			for {
				if _, _, err := rw.ReadMessage(); err != nil {
					errorchan <- nil
					return
				}
			}
		}()

		go func() {
			defer func() {
				if r := recover(); r != nil {
					// TODO: add method to alert on panic
					return
				}
			}()

			// listens for websocket closing handshake
			defer wg.Done()

			informer.SetWatchErrorHandler(func(r *cache.Reflector, err error) {
				if strings.HasSuffix(err.Error(), ": Unauthorized") {
					errorchan <- &AuthError{}
				}
			})

			informer.AddEventHandler(cache.ResourceEventHandlerFuncs{
				UpdateFunc: func(oldObj, newObj interface{}) {
					secretObj, ok := newObj.(*v1.Secret)

					if !ok {
						errorchan <- fmt.Errorf("could not cast to secret")
						return
					}

					helm_object, isNotHelmRelease, err := ParseSecretToHelmRelease(*secretObj, chartList)

					if isNotHelmRelease && err == nil {
						return
					}

					if err != nil {
						errorchan <- err
						return
					}

					msg := Message{
						EventType: "UPDATE",
						Object:    helm_object,
					}

					rw.WriteJSON(msg)
				},
				AddFunc: func(obj interface{}) {
					secretObj, ok := obj.(*v1.Secret)

					if !ok {
						errorchan <- fmt.Errorf("could not cast to secret")
						return
					}

					helm_object, isNotHelmRelease, err := ParseSecretToHelmRelease(*secretObj, chartList)

					if isNotHelmRelease && err == nil {
						return
					}

					if err != nil {
						errorchan <- err
						return
					}

					msg := Message{
						EventType: "ADD",
						Object:    helm_object,
					}

					rw.WriteJSON(msg)
				},
				DeleteFunc: func(obj interface{}) {
					secretObj, ok := obj.(*v1.Secret)

					if !ok {
						errorchan <- fmt.Errorf("could not cast to secret")
						return
					}

					helm_object, isNotHelmRelease, err := ParseSecretToHelmRelease(*secretObj, chartList)

					if isNotHelmRelease && err == nil {
						return
					}

					if err != nil {
						errorchan <- err
						return
					}

					msg := Message{
						EventType: "DELETE",
						Object:    helm_object,
					}

					rw.WriteJSON(msg)
				},
			})

			informer.Run(stopper)
		}()

		for err = range errorchan {
			once.Do(func() {
				close(stopper)
				rw.Close()
			})
		}

		return err
	}

	return a.RunWebsocketTask(run)
}

func (a *Agent) StreamPorterAgentLokiLog(
	labels []string,
	startTime string,
	searchParam string,
	limit uint32,
	rw *websocket.WebsocketSafeReadWriter,
) error {
	run := func() error {
		errorchan := make(chan error)

		var wg sync.WaitGroup
		var once sync.Once
		var err error

		wg.Add(2)

		go func() {
			wg.Wait()
			close(errorchan)
		}()

		go func() {
			defer func() {
				if r := recover(); r != nil {
					// TODO: add method to alert on panic
					return
				}
			}()

			defer wg.Done()

			// listens for websocket closing handshake
			for {
				if _, _, err := rw.ReadMessage(); err != nil {
					errorchan <- nil
					return
				}
			}
		}()

		go func() {
			defer func() {
				if r := recover(); r != nil {
					// TODO: add method to alert on panic
					return
				}
			}()

			defer wg.Done()

			podList, err := a.Clientset.CoreV1().Pods("porter-agent-system").List(context.Background(), metav1.ListOptions{
				LabelSelector: "control-plane=controller-manager",
			})

			if err != nil {
				errorchan <- err
				return
			}

			if len(podList.Items) == 0 {
				errorchan <- fmt.Errorf("no porter agent pods found")
				return
			}

			pod := podList.Items[0]

			restConf, err := a.RESTClientGetter.ToRESTConfig()

			if err != nil {
				errorchan <- err
				return
			}

			req := a.Clientset.CoreV1().RESTClient().
				Post().
				Resource("pods").
				Name(pod.Name).
				Namespace(pod.Namespace).
				SubResource("exec")

			cmd := []string{
				"/porter/agent-cli",
				"--start",
				startTime,
			}

			for _, label := range labels {
				cmd = append(cmd, "--label", label)
			}

			if searchParam != "" {
				cmd = append(cmd, "--search", searchParam)
			}

			if limit > 0 {
				cmd = append(cmd, "--limit", fmt.Sprintf("%d", limit))
			}

			opts := &v1.PodExecOptions{
				Command: cmd,
				Stdout:  true,
				Stderr:  true,
			}

			req.VersionedParams(
				opts,
				scheme.ParameterCodec,
			)

			exec, err := remotecommand.NewSPDYExecutor(restConf, "POST", req.URL())

			if err != nil {
				errorchan <- err
				return
			}

			err = exec.Stream(remotecommand.StreamOptions{
				Stdin:  nil,
				Stdout: rw,
				Stderr: rw,
			})

			if err != nil {
				errorchan <- err
				return
			}
		}()

		for err = range errorchan {
			once.Do(func() {
				rw.Close()
			})
		}

		return err
	}

	return a.RunWebsocketTask(run)
}

// CreateImagePullSecrets will create the required image pull secrets and
// return a map from the registry name to the name of the secret.
func (a *Agent) CreateImagePullSecrets(
	repo repository.Repository,
	namespace string,
	linkedRegs map[string]*models.Registry,
	doAuth *oauth2.Config,
) (map[string]string, error) {
	res := make(map[string]string)

	for key, val := range linkedRegs {
		_reg := registry.Registry(*val)

		data, err := _reg.GetDockerConfigJSON(repo, doAuth)

		if err != nil {
			return nil, err
		}

		secretName := fmt.Sprintf("porter-%s-%d", val.ToRegistryType().Service, val.ID)

		secret, err := a.Clientset.CoreV1().Secrets(namespace).Get(
			context.TODO(),
			secretName,
			metav1.GetOptions{},
		)

		// if not found, create the secret
		if err != nil && errors.IsNotFound(err) {
			_, err = a.Clientset.CoreV1().Secrets(namespace).Create(
				context.TODO(),
				&v1.Secret{
					ObjectMeta: metav1.ObjectMeta{
						Name: secretName,
					},
					Data: map[string][]byte{
						string(v1.DockerConfigJsonKey): data,
					},
					Type: v1.SecretTypeDockerConfigJson,
				},
				metav1.CreateOptions{},
			)

			if err != nil {
				return nil, err
			}

			// add secret name to the map
			res[key] = secretName

			continue
		} else if err != nil {
			return nil, err
		}

		// otherwise, check that the secret contains the correct data: if
		// if doesn't, update it
		if !bytes.Equal(secret.Data[v1.DockerConfigJsonKey], data) {
			_, err := a.Clientset.CoreV1().Secrets(namespace).Update(
				context.TODO(),
				&v1.Secret{
					ObjectMeta: metav1.ObjectMeta{
						Name: secretName,
					},
					Data: map[string][]byte{
						string(v1.DockerConfigJsonKey): data,
					},
					Type: v1.SecretTypeDockerConfigJson,
				},
				metav1.UpdateOptions{},
			)

			if err != nil {
				return nil, err
			}
		}

		// add secret name to the map
		res[key] = secretName
	}

	return res, nil
}

// helper that waits for pod to be ready
func (a *Agent) waitForPod(pod *v1.Pod) (error, bool) {
	var (
		w   watch.Interface
		err error
		ok  bool
	)
	// immediately after creating a pod, the API may return a 404. heuristically 1
	// second seems to be plenty.
	watchRetries := 3
	for i := 0; i < watchRetries; i++ {
		selector := fields.OneTermEqualSelector("metadata.name", pod.Name).String()
		w, err = a.Clientset.CoreV1().
			Pods(pod.Namespace).
			Watch(context.Background(), metav1.ListOptions{FieldSelector: selector})

		if err == nil {
			break
		}
		time.Sleep(time.Second)
	}
	if err != nil {
		return err, false
	}
	defer w.Stop()

	expireTime := time.Now().Add(time.Second * 30)

	for time.Now().Unix() <= expireTime.Unix() {
		select {
		case <-time.NewTicker(time.Second).C:
			// poll every second in case we already missed the ready event while
			// creating the listener.
			pod, err = a.Clientset.CoreV1().
				Pods(pod.Namespace).
				Get(context.Background(), pod.Name, metav1.GetOptions{})

			if err != nil && errors.IsNotFound(err) {
				return IsNotFoundError, false
			} else if err != nil {
				return err, false
			}

			if isExited := isPodExited(pod); isExited || isPodReady(pod) {
				return nil, isExited
			}
		case evt := <-w.ResultChan():
			pod, ok = evt.Object.(*v1.Pod)
			if !ok {
				return fmt.Errorf("unexpected object type: %T", evt.Object), false
			}
			if isExited := isPodExited(pod); isExited || isPodReady(pod) {
				return nil, isExited
			}
		}
	}

	return goerrors.New("timed out waiting for pod"), false
}

func isPodReady(pod *v1.Pod) bool {
	ready := false
	conditions := pod.Status.Conditions
	for i := range conditions {
		if conditions[i].Type == v1.PodReady {
			ready = pod.Status.Conditions[i].Status == v1.ConditionTrue
		}
	}
	return ready
}

func isPodExited(pod *v1.Pod) bool {
	return pod.Status.Phase == v1.PodSucceeded || pod.Status.Phase == v1.PodFailed
}
