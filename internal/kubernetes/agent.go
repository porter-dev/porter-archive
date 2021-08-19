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
	"strings"

	"github.com/porter-dev/porter/internal/kubernetes/provisioner"
	"github.com/porter-dev/porter/internal/kubernetes/provisioner/aws"
	"github.com/porter-dev/porter/internal/kubernetes/provisioner/aws/ecr"
	"github.com/porter-dev/porter/internal/kubernetes/provisioner/aws/eks"
	"github.com/porter-dev/porter/internal/kubernetes/provisioner/do"
	"github.com/porter-dev/porter/internal/kubernetes/provisioner/do/docr"
	"github.com/porter-dev/porter/internal/kubernetes/provisioner/do/doks"
	"github.com/porter-dev/porter/internal/kubernetes/provisioner/gcp"
	"github.com/porter-dev/porter/internal/kubernetes/provisioner/gcp/gke"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/models/integrations"
	"github.com/porter-dev/porter/internal/oauth"
	"github.com/porter-dev/porter/internal/registry"
	"github.com/porter-dev/porter/internal/repository"
	"golang.org/x/oauth2"

	"github.com/gorilla/websocket"
	"github.com/porter-dev/porter/internal/helm/grapher"
	appsv1 "k8s.io/api/apps/v1"
	batchv1 "k8s.io/api/batch/v1"
	batchv1beta1 "k8s.io/api/batch/v1beta1"
	v1 "k8s.io/api/core/v1"
	v1beta1 "k8s.io/api/extensions/v1beta1"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/cli-runtime/pkg/genericclioptions"
	"k8s.io/client-go/informers"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/cache"
	"k8s.io/client-go/tools/remotecommand"

	"github.com/porter-dev/porter/internal/config"

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
func (a *Agent) UpdateConfigMap(name string, namespace string, configMap map[string]string) error {
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
		return err
	}

	_, err = a.Clientset.CoreV1().ConfigMaps(namespace).Patch(
		context.Background(),
		name,
		types.MergePatchType,
		patchBytes,
		metav1.PatchOptions{},
	)

	return err
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

// GetConfigMap retrieves the configmap given its name and namespace
func (a *Agent) GetConfigMap(name string, namespace string) (*v1.ConfigMap, error) {
	return a.Clientset.CoreV1().ConfigMaps(namespace).Get(
		context.TODO(),
		name,
		metav1.GetOptions{},
	)
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
			LabelSelector: "porter=true",
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
func (a *Agent) CreateNamespace(name string) (*v1.Namespace, error) {
	// check if namespace exists
	checkNS, err := a.Clientset.CoreV1().Namespaces().Get(
		context.TODO(),
		name,
		metav1.GetOptions{},
	)

	if err == nil && checkNS != nil {
		return checkNS, nil
	}

	namespace := v1.Namespace{
		ObjectMeta: metav1.ObjectMeta{
			Name: name,
		},
	}

	return a.Clientset.CoreV1().Namespaces().Create(
		context.TODO(),
		&namespace,
		metav1.CreateOptions{},
	)
}

func (a *Agent) GetPorterAgent() (*appsv1.Deployment, error) {
	return a.Clientset.AppsV1().Deployments("porter-agent-system").Get(
		context.TODO(),
		"porter-agent-controller-manager",
		metav1.GetOptions{},
	)
}

// DeleteNamespace deletes the namespace given the name.
func (a *Agent) DeleteNamespace(name string) error {
	return a.Clientset.CoreV1().Namespaces().Delete(
		context.TODO(),
		name,
		metav1.DeleteOptions{},
	)
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
func (a *Agent) GetIngress(namespace string, name string) (*v1beta1.Ingress, error) {
	return a.Clientset.ExtensionsV1beta1().Ingresses(namespace).Get(
		context.TODO(),
		name,
		metav1.GetOptions{},
	)
}

// GetDeployment gets the deployment given the name and namespace
func (a *Agent) GetDeployment(c grapher.Object) (*appsv1.Deployment, error) {
	return a.Clientset.AppsV1().Deployments(c.Namespace).Get(
		context.TODO(),
		c.Name,
		metav1.GetOptions{},
	)
}

// GetStatefulSet gets the statefulset given the name and namespace
func (a *Agent) GetStatefulSet(c grapher.Object) (*appsv1.StatefulSet, error) {
	return a.Clientset.AppsV1().StatefulSets(c.Namespace).Get(
		context.TODO(),
		c.Name,
		metav1.GetOptions{},
	)
}

// GetReplicaSet gets the replicaset given the name and namespace
func (a *Agent) GetReplicaSet(c grapher.Object) (*appsv1.ReplicaSet, error) {
	return a.Clientset.AppsV1().ReplicaSets(c.Namespace).Get(
		context.TODO(),
		c.Name,
		metav1.GetOptions{},
	)
}

// GetDaemonSet gets the daemonset by name and namespace
func (a *Agent) GetDaemonSet(c grapher.Object) (*appsv1.DaemonSet, error) {
	return a.Clientset.AppsV1().DaemonSets(c.Namespace).Get(
		context.TODO(),
		c.Name,
		metav1.GetOptions{},
	)
}

// GetJob gets the job by name and namespace
func (a *Agent) GetJob(c grapher.Object) (*batchv1.Job, error) {
	return a.Clientset.BatchV1().Jobs(c.Namespace).Get(
		context.TODO(),
		c.Name,
		metav1.GetOptions{},
	)
}

// GetCronJob gets the CronJob by name and namespace
func (a *Agent) GetCronJob(c grapher.Object) (*batchv1beta1.CronJob, error) {
	return a.Clientset.BatchV1beta1().CronJobs(c.Namespace).Get(
		context.TODO(),
		c.Name,
		metav1.GetOptions{},
	)
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

// DeletePod deletes a pod by name and namespace
func (a *Agent) DeletePod(namespace string, name string) error {
	return a.Clientset.CoreV1().Pods(namespace).Delete(
		context.TODO(),
		name,
		metav1.DeleteOptions{},
	)
}

// GetPodLogs streams real-time logs from a given pod.
func (a *Agent) GetPodLogs(namespace string, name string, conn *websocket.Conn) error {
	// get the pod to read in the list of contains
	pod, err := a.Clientset.CoreV1().Pods(namespace).Get(
		context.Background(),
		name,
		metav1.GetOptions{},
	)

	if err != nil {
		return fmt.Errorf("Cannot get pod %s: %s", name, err.Error())
	}

	container := pod.Spec.Containers[0].Name

	tails := int64(400)

	// follow logs
	podLogOpts := v1.PodLogOptions{
		Follow:    true,
		TailLines: &tails,
		Container: container,
	}

	req := a.Clientset.CoreV1().Pods(namespace).GetLogs(name, &podLogOpts)

	podLogs, err := req.Stream(context.TODO())

	if err != nil {
		return fmt.Errorf("Cannot open log stream for pod %s: %s", name, err.Error())
	}
	defer podLogs.Close()

	r := bufio.NewReader(podLogs)
	errorchan := make(chan error)

	go func() {
		// listens for websocket closing handshake
		for {
			if _, _, err := conn.ReadMessage(); err != nil {
				defer conn.Close()
				errorchan <- nil
				return
			}
		}
	}()

	go func() {
		for {
			select {
			case <-errorchan:
				defer close(errorchan)
				return
			default:
			}

			bytes, err := r.ReadBytes('\n')
			if writeErr := conn.WriteMessage(websocket.TextMessage, bytes); writeErr != nil {
				errorchan <- writeErr
				return
			}
			if err != nil {
				if err != io.EOF {
					errorchan <- err
					return
				}
				errorchan <- nil
				return
			}
		}
	}()

	for {
		select {
		case err = <-errorchan:
			return err
		}
	}
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

// StreamControllerStatus streams controller status. Supports Deployment, StatefulSet, ReplicaSet, and DaemonSet
// TODO: Support Jobs
func (a *Agent) StreamControllerStatus(conn *websocket.Conn, kind string, selectors string) error {
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
	defer close(stopper)

	informer.AddEventHandler(cache.ResourceEventHandlerFuncs{
		UpdateFunc: func(oldObj, newObj interface{}) {
			msg := Message{
				EventType: "UPDATE",
				Object:    newObj,
				Kind:      strings.ToLower(kind),
			}
			if writeErr := conn.WriteJSON(msg); writeErr != nil {
				errorchan <- writeErr
				return
			}
		},
		AddFunc: func(obj interface{}) {
			msg := Message{
				EventType: "ADD",
				Object:    obj,
				Kind:      strings.ToLower(kind),
			}

			if writeErr := conn.WriteJSON(msg); writeErr != nil {
				errorchan <- writeErr
				return
			}
		},
		DeleteFunc: func(obj interface{}) {
			msg := Message{
				EventType: "DELETE",
				Object:    obj,
				Kind:      strings.ToLower(kind),
			}

			if writeErr := conn.WriteJSON(msg); writeErr != nil {
				errorchan <- writeErr
				return
			}
		},
	})

	go func() {
		// listens for websocket closing handshake
		for {
			if _, _, err := conn.ReadMessage(); err != nil {
				conn.Close()
				errorchan <- nil
				return
			}
		}
	}()

	go informer.Run(stopper)

	for {
		select {
		case err := <-errorchan:
			return err
		}
	}
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

func parseSecretToHelmRelease(secret v1.Secret, chartList []string) (*rspb.Release, bool, error) {
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

func (a *Agent) StreamHelmReleases(conn *websocket.Conn, chartList []string, selectors string) error {
	tweakListOptionsFunc := func(options *metav1.ListOptions) {
		options.LabelSelector = selectors
	}

	factory := informers.NewSharedInformerFactoryWithOptions(
		a.Clientset,
		0,
		informers.WithTweakListOptions(tweakListOptionsFunc),
	)

	informer := factory.Core().V1().Secrets().Informer()

	stopper := make(chan struct{})
	errorchan := make(chan error)
	defer close(stopper)

	informer.AddEventHandler(cache.ResourceEventHandlerFuncs{
		UpdateFunc: func(oldObj, newObj interface{}) {
			secretObj, ok := newObj.(*v1.Secret)

			if !ok {
				errorchan <- fmt.Errorf("could not cast to secret")
				return
			}

			helm_object, isNotHelmRelease, err := parseSecretToHelmRelease(*secretObj, chartList)

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

			if writeErr := conn.WriteJSON(msg); writeErr != nil {
				errorchan <- writeErr
				return
			}
		},
		AddFunc: func(obj interface{}) {
			secretObj, ok := obj.(*v1.Secret)

			if !ok {
				errorchan <- fmt.Errorf("could not cast to secret")
				return
			}

			helm_object, isNotHelmRelease, err := parseSecretToHelmRelease(*secretObj, chartList)

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

			if writeErr := conn.WriteJSON(msg); writeErr != nil {
				errorchan <- writeErr
				return
			}
		},
		DeleteFunc: func(obj interface{}) {
			secretObj, ok := obj.(*v1.Secret)

			if !ok {
				errorchan <- fmt.Errorf("could not cast to secret")
				return
			}

			helm_object, isNotHelmRelease, err := parseSecretToHelmRelease(*secretObj, chartList)

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

			if writeErr := conn.WriteJSON(msg); writeErr != nil {
				errorchan <- writeErr
				return
			}
		},
	})

	go func() {
		// listens for websocket closing handshake
		for {
			if _, _, err := conn.ReadMessage(); err != nil {
				conn.Close()
				errorchan <- nil
				return
			}
		}
	}()

	go informer.Run(stopper)

	for {
		select {
		case err := <-errorchan:
			return err
		}
	}
}

// ProvisionECR spawns a new provisioning pod that creates an ECR instance
func (a *Agent) ProvisionECR(
	projectID uint,
	awsConf *integrations.AWSIntegration,
	ecrName string,
	repo repository.Repository,
	infra *models.Infra,
	operation provisioner.ProvisionerOperation,
	pgConf *config.DBConf,
	redisConf *config.RedisConf,
	provImageTag string,
	provImagePullSecret string,
) (*batchv1.Job, error) {
	id := infra.GetUniqueName()
	prov := &provisioner.Conf{
		ID:                  id,
		Name:                fmt.Sprintf("prov-%s-%s", id, string(operation)),
		Kind:                provisioner.ECR,
		Operation:           operation,
		Redis:               redisConf,
		Postgres:            pgConf,
		ProvisionerImageTag: provImageTag,
		ImagePullSecret:     provImagePullSecret,
		LastApplied:         infra.LastApplied,
		AWS: &aws.Conf{
			AWSRegion:          awsConf.AWSRegion,
			AWSAccessKeyID:     string(awsConf.AWSAccessKeyID),
			AWSSecretAccessKey: string(awsConf.AWSSecretAccessKey),
		},
		ECR: &ecr.Conf{
			ECRName: ecrName,
		},
	}

	return a.provision(prov, infra, repo)
}

// ProvisionEKS spawns a new provisioning pod that creates an EKS instance
func (a *Agent) ProvisionEKS(
	projectID uint,
	awsConf *integrations.AWSIntegration,
	eksName, machineType string,
	repo repository.Repository,
	infra *models.Infra,
	operation provisioner.ProvisionerOperation,
	pgConf *config.DBConf,
	redisConf *config.RedisConf,
	provImageTag string,
	provImagePullSecret string,
) (*batchv1.Job, error) {
	id := infra.GetUniqueName()
	prov := &provisioner.Conf{
		ID:                  id,
		Name:                fmt.Sprintf("prov-%s-%s", id, string(operation)),
		Kind:                provisioner.EKS,
		Operation:           operation,
		Redis:               redisConf,
		Postgres:            pgConf,
		ProvisionerImageTag: provImageTag,
		ImagePullSecret:     provImagePullSecret,
		LastApplied:         infra.LastApplied,
		AWS: &aws.Conf{
			AWSRegion:          awsConf.AWSRegion,
			AWSAccessKeyID:     string(awsConf.AWSAccessKeyID),
			AWSSecretAccessKey: string(awsConf.AWSSecretAccessKey),
		},
		EKS: &eks.Conf{
			ClusterName: eksName,
			MachineType: machineType,
		},
	}

	return a.provision(prov, infra, repo)
}

// ProvisionGCR spawns a new provisioning pod that creates a GCR instance
func (a *Agent) ProvisionGCR(
	projectID uint,
	gcpConf *integrations.GCPIntegration,
	repo repository.Repository,
	infra *models.Infra,
	operation provisioner.ProvisionerOperation,
	pgConf *config.DBConf,
	redisConf *config.RedisConf,
	provImageTag string,
	provImagePullSecret string,
) (*batchv1.Job, error) {
	id := infra.GetUniqueName()
	prov := &provisioner.Conf{
		ID:                  id,
		Name:                fmt.Sprintf("prov-%s-%s", id, string(operation)),
		Kind:                provisioner.GCR,
		Operation:           operation,
		Redis:               redisConf,
		Postgres:            pgConf,
		ProvisionerImageTag: provImageTag,
		ImagePullSecret:     provImagePullSecret,
		LastApplied:         infra.LastApplied,
		GCP: &gcp.Conf{
			GCPRegion:    gcpConf.GCPRegion,
			GCPProjectID: gcpConf.GCPProjectID,
			GCPKeyData:   string(gcpConf.GCPKeyData),
		},
	}

	return a.provision(prov, infra, repo)
}

// ProvisionGKE spawns a new provisioning pod that creates a GKE instance
func (a *Agent) ProvisionGKE(
	projectID uint,
	gcpConf *integrations.GCPIntegration,
	gkeName string,
	repo repository.Repository,
	infra *models.Infra,
	operation provisioner.ProvisionerOperation,
	pgConf *config.DBConf,
	redisConf *config.RedisConf,
	provImageTag string,
	provImagePullSecret string,
) (*batchv1.Job, error) {
	id := infra.GetUniqueName()
	prov := &provisioner.Conf{
		ID:                  id,
		Name:                fmt.Sprintf("prov-%s-%s", id, string(operation)),
		Kind:                provisioner.GKE,
		Operation:           operation,
		Redis:               redisConf,
		Postgres:            pgConf,
		ProvisionerImageTag: provImageTag,
		ImagePullSecret:     provImagePullSecret,
		LastApplied:         infra.LastApplied,
		GCP: &gcp.Conf{
			GCPRegion:    gcpConf.GCPRegion,
			GCPProjectID: gcpConf.GCPProjectID,
			GCPKeyData:   string(gcpConf.GCPKeyData),
		},
		GKE: &gke.Conf{
			ClusterName: gkeName,
		},
	}

	return a.provision(prov, infra, repo)
}

// ProvisionDOCR spawns a new provisioning pod that creates a DOCR instance
func (a *Agent) ProvisionDOCR(
	projectID uint,
	doConf *integrations.OAuthIntegration,
	doAuth *oauth2.Config,
	repo repository.Repository,
	docrName, docrSubscriptionTier string,
	infra *models.Infra,
	operation provisioner.ProvisionerOperation,
	pgConf *config.DBConf,
	redisConf *config.RedisConf,
	provImageTag string,
	provImagePullSecret string,
) (*batchv1.Job, error) {
	// get the token
	oauthInt, err := repo.OAuthIntegration.ReadOAuthIntegration(
		infra.DOIntegrationID,
	)

	if err != nil {
		return nil, err
	}

	tok, _, err := oauth.GetAccessToken(oauthInt.SharedOAuthModel, doAuth, oauth.MakeUpdateOAuthIntegrationTokenFunction(oauthInt, repo))

	if err != nil {
		return nil, err
	}

	id := infra.GetUniqueName()
	prov := &provisioner.Conf{
		ID:                  id,
		Name:                fmt.Sprintf("prov-%s-%s", id, string(operation)),
		Kind:                provisioner.DOCR,
		Operation:           operation,
		Redis:               redisConf,
		Postgres:            pgConf,
		ProvisionerImageTag: provImageTag,
		ImagePullSecret:     provImagePullSecret,
		LastApplied:         infra.LastApplied,
		DO: &do.Conf{
			DOToken: tok,
		},
		DOCR: &docr.Conf{
			DOCRName:             docrName,
			DOCRSubscriptionTier: docrSubscriptionTier,
		},
	}

	return a.provision(prov, infra, repo)
}

// ProvisionDOKS spawns a new provisioning pod that creates a DOKS instance
func (a *Agent) ProvisionDOKS(
	projectID uint,
	doConf *integrations.OAuthIntegration,
	doAuth *oauth2.Config,
	repo repository.Repository,
	doRegion, doksClusterName string,
	infra *models.Infra,
	operation provisioner.ProvisionerOperation,
	pgConf *config.DBConf,
	redisConf *config.RedisConf,
	provImageTag string,
	provImagePullSecret string,
) (*batchv1.Job, error) {
	// get the token
	oauthInt, err := repo.OAuthIntegration.ReadOAuthIntegration(
		infra.DOIntegrationID,
	)

	if err != nil {
		return nil, err
	}

	tok, _, err := oauth.GetAccessToken(oauthInt.SharedOAuthModel, doAuth, oauth.MakeUpdateOAuthIntegrationTokenFunction(oauthInt, repo))

	if err != nil {
		return nil, err
	}

	id := infra.GetUniqueName()
	prov := &provisioner.Conf{
		ID:                  id,
		Name:                fmt.Sprintf("prov-%s-%s", id, string(operation)),
		Kind:                provisioner.DOKS,
		Operation:           operation,
		Redis:               redisConf,
		Postgres:            pgConf,
		LastApplied:         infra.LastApplied,
		ProvisionerImageTag: provImageTag,
		ImagePullSecret:     provImagePullSecret,
		DO: &do.Conf{
			DOToken: tok,
		},
		DOKS: &doks.Conf{
			DORegion:        doRegion,
			DOKSClusterName: doksClusterName,
		},
	}

	return a.provision(prov, infra, repo)
}

// ProvisionTest spawns a new provisioning pod that tests provisioning
func (a *Agent) ProvisionTest(
	projectID uint,
	infra *models.Infra,
	repo repository.Repository,
	operation provisioner.ProvisionerOperation,
	pgConf *config.DBConf,
	redisConf *config.RedisConf,
	provImageTag string,
	provImagePullSecret string,
) (*batchv1.Job, error) {
	id := infra.GetUniqueName()

	prov := &provisioner.Conf{
		ID:                  id,
		Name:                fmt.Sprintf("prov-%s-%s", id, string(operation)),
		Operation:           operation,
		Kind:                provisioner.Test,
		Redis:               redisConf,
		Postgres:            pgConf,
		ProvisionerImageTag: provImageTag,
		ImagePullSecret:     provImagePullSecret,
	}

	return a.provision(prov, infra, repo)
}

func (a *Agent) provision(
	prov *provisioner.Conf,
	infra *models.Infra,
	repo repository.Repository,
) (*batchv1.Job, error) {
	prov.Namespace = "default"

	job, err := prov.GetProvisionerJobTemplate()

	if err != nil {
		return nil, err
	}

	job, err = a.Clientset.BatchV1().Jobs(prov.Namespace).Create(
		context.TODO(),
		job,
		metav1.CreateOptions{},
	)

	if err != nil {
		return nil, err
	}

	infra.LastApplied = prov.LastApplied
	infra, err = repo.Infra.UpdateInfra(infra)

	if err != nil {
		return nil, err
	}

	return job, nil
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

		secretName := fmt.Sprintf("porter-%s-%d", val.Externalize().Service, val.ID)

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
