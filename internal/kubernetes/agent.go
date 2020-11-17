package kubernetes

import (
	"bufio"
	"context"
	"fmt"
	"io"

	"github.com/gorilla/websocket"
	appsv1 "k8s.io/api/apps/v1"
	v1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/cli-runtime/pkg/genericclioptions"
	"k8s.io/client-go/informers"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/tools/cache"
)

// Agent is a Kubernetes agent for performing operations that interact with the
// api server
type Agent struct {
	RESTClientGetter genericclioptions.RESTClientGetter
	Clientset        kubernetes.Interface
}

// ListNamespaces simply lists namespaces
func (a *Agent) ListNamespaces() (*v1.NamespaceList, error) {
	return a.Clientset.CoreV1().Namespaces().List(
		context.TODO(),
		metav1.ListOptions{},
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
	// follow logs
	tails := int64(30)
	podLogOpts := v1.PodLogOptions{
		Follow:    true,
		TailLines: &tails,
	}
	req := a.Clientset.CoreV1().Pods(namespace).GetLogs(name, &podLogOpts)
	podLogs, err := req.Stream(context.TODO())
	if err != nil {
		return fmt.Errorf("Cannot open log stream for pod %s", name)
	}

	r := bufio.NewReader(podLogs)
	for {
		bytes, err := r.ReadBytes('\n')
		fmt.Println(bytes)
		if writeErr := conn.WriteMessage(websocket.TextMessage, bytes); writeErr != nil {
			return writeErr
		}

		if err != nil {
			if err != io.EOF {
				return err
			}
			return nil
		}
	}
}

// StreamDeploymentStatus streams deployment status.
func (a *Agent) StreamDeploymentStatus(conn *websocket.Conn) error {
	fmt.Println("===========================streaming dep status============================")

	factory := informers.NewSharedInformerFactory(a.Clientset, 0)
	informer := factory.Apps().V1().Deployments().Informer()
	stopper := make(chan struct{})
	defer close(stopper)
	defer fmt.Println("closing...")

	informer.AddEventHandler(cache.ResourceEventHandlerFuncs{
		AddFunc: func(obj interface{}) {
			d := obj.(*appsv1.Deployment)
			fmt.Printf("adding deployment %s\n", d.Name)
			fmt.Println(d.Status.Replicas == d.Status.AvailableReplicas)
		},
		UpdateFunc: func(oldObj, newObj interface{}) {
			d := newObj.(*appsv1.Deployment)
			fmt.Printf("updating deployment %s\n", d.Name)
			fmt.Println(d.Status.Replicas == d.Status.AvailableReplicas)
			fmt.Println(d.Status.Conditions[0].Message)
		},
		DeleteFunc: func(obj interface{}) {
			d := obj.(*appsv1.Deployment)
			fmt.Printf("deleting deployment %s\n", d.Name)
			fmt.Println(d.Status.Replicas == d.Status.AvailableReplicas)
		},
	})

	informer.Run(stopper)
	return nil
}
