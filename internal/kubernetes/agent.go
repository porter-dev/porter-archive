package kubernetes

import (
	"bufio"
	"bytes"
	"context"
	"fmt"
	"io"
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
	"k8s.io/cli-runtime/pkg/genericclioptions"
	"k8s.io/client-go/informers"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/tools/cache"

	"github.com/porter-dev/porter/internal/config"
)

// Agent is a Kubernetes agent for performing operations that interact with the
// api server
type Agent struct {
	RESTClientGetter genericclioptions.RESTClientGetter
	Clientset        kubernetes.Interface
}

type Message struct {
	EventType string
	Object    interface{}
	Kind      string
}

type ListOptions struct {
	FieldSelector string
}

// ListNamespaces simply lists namespaces
func (a *Agent) ListNamespaces() (*v1.NamespaceList, error) {
	return a.Clientset.CoreV1().Namespaces().List(
		context.TODO(),
		metav1.ListOptions{},
	)
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
func (a *Agent) GetPodsByLabel(selector string) (*v1.PodList, error) {
	// Search in all namespaces for matching pods
	return a.Clientset.CoreV1().Pods("").List(
		context.TODO(),
		metav1.ListOptions{
			LabelSelector: selector,
		},
	)
}

// GetPodLogs streams real-time logs from a given pod.
func (a *Agent) GetPodLogs(namespace string, name string, conn *websocket.Conn) error {
	tails := int64(400)

	// follow logs
	podLogOpts := v1.PodLogOptions{
		Follow:    true,
		TailLines: &tails,
	}
	req := a.Clientset.CoreV1().Pods(namespace).GetLogs(name, &podLogOpts)
	podLogs, err := req.Stream(context.TODO())
	if err != nil {
		return fmt.Errorf("Cannot open log stream for pod %s", name)
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

// StreamControllerStatus streams controller status. Supports Deployment, StatefulSet, ReplicaSet, and DaemonSet
// TODO: Support Jobs
func (a *Agent) StreamControllerStatus(conn *websocket.Conn, kind string) error {
	factory := informers.NewSharedInformerFactory(
		a.Clientset,
		0,
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
	}

	stopper := make(chan struct{})
	errorchan := make(chan error)
	defer close(errorchan)

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
	})

	go func() {
		// listens for websocket closing handshake
		for {
			if _, _, err := conn.ReadMessage(); err != nil {
				defer conn.Close()
				defer close(stopper)
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
	eksName string,
	repo repository.Repository,
	infra *models.Infra,
	operation provisioner.ProvisionerOperation,
	pgConf *config.DBConf,
	redisConf *config.RedisConf,
	provImageTag string,
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
		LastApplied:         infra.LastApplied,
		AWS: &aws.Conf{
			AWSRegion:          awsConf.AWSRegion,
			AWSAccessKeyID:     string(awsConf.AWSAccessKeyID),
			AWSSecretAccessKey: string(awsConf.AWSSecretAccessKey),
		},
		EKS: &eks.Conf{
			ClusterName: eksName,
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
) (*batchv1.Job, error) {
	// get the token
	oauthInt, err := repo.OAuthIntegration.ReadOAuthIntegration(
		infra.DOIntegrationID,
	)

	if err != nil {
		return nil, err
	}

	tok, _, err := oauth.GetAccessToken(oauthInt, doAuth, repo)

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
) (*batchv1.Job, error) {
	// get the token
	oauthInt, err := repo.OAuthIntegration.ReadOAuthIntegration(
		infra.DOIntegrationID,
	)

	if err != nil {
		return nil, err
	}

	tok, _, err := oauth.GetAccessToken(oauthInt, doAuth, repo)

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
