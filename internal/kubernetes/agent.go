package kubernetes

import (
	"bufio"
	"context"
	"fmt"
	"io"

	"github.com/gorilla/websocket"
	v1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/cli-runtime/pkg/genericclioptions"
	"k8s.io/client-go/kubernetes"
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
	for {
		bytes, err := r.ReadBytes('\n')

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
