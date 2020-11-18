package kubernetes

import (
	"bufio"
	"context"
	"fmt"
	"io"

	"github.com/gorilla/websocket"
	"github.com/porter-dev/porter/internal/helm/grapher"
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

type Message struct {
	MessageType string
	Object      interface{}
}

// ListNamespaces simply lists namespaces
func (a *Agent) ListNamespaces() (*v1.NamespaceList, error) {
	return a.Clientset.CoreV1().Namespaces().List(
		context.TODO(),
		metav1.ListOptions{},
	)
}

// GetDeployment gets the depployment given the name and namespace
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
	defer podLogs.Close()

	r := bufio.NewReader(podLogs)
	errorchan := make(chan error)

	go func() {
		// listens for websocket closing handshake
		for {
			if _, _, err := conn.ReadMessage(); err != nil {
				conn.Close()
				errorchan <- nil
				fmt.Println("Successfully closed log stream")
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

// StreamDeploymentStatus streams deployment status.
func (a *Agent) StreamDeploymentStatus(conn *websocket.Conn) error {

	factory := informers.NewSharedInformerFactory(a.Clientset, 0)
	informer := factory.Apps().V1().Deployments().Informer()
	stopper := make(chan struct{})
	errorchan := make(chan error)
	defer close(errorchan)

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
			msg := Message{
				MessageType: "DELETION",
				Object:      d,
			}
			if writeErr := conn.WriteJSON(msg); writeErr != nil {
				errorchan <- writeErr
				return
			}
			fmt.Printf("deleting deployment %s\n", d.Name)
		},
	})

	go func() {
		// listens for websocket closing handshake
		for {
			if _, _, err := conn.ReadMessage(); err != nil {
				defer conn.Close()
				defer close(stopper)
				defer fmt.Println("Successfully closed deployment status stream")
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
