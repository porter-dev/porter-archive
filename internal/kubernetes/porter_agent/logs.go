package porter_agent

import (
	"context"
	"encoding/json"
	"fmt"

	v1 "k8s.io/api/core/v1"
	"k8s.io/client-go/kubernetes"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// returns the agent service
func GetAgentService(clientset kubernetes.Interface) (*v1.Service, error) {
	return clientset.CoreV1().Services("porter-agent-system").Get(
		context.TODO(),
		"porter-agent-controller-manager",
		metav1.GetOptions{},
	)
}

type SimpleIngress struct {
	Name      string `json:"name"`
	Namespace string `json:"namespace"`
}

type PathOpts struct {
	Timestamp int
	Pod       string
	Namespace string
}

func QueryPorterAgent(
	clientset kubernetes.Interface,
	service *v1.Service,
	opts *PathOpts,
) (*AgentResp, error) {
	if len(service.Spec.Ports) == 0 {
		return nil, fmt.Errorf("agent service has no exposed ports to query")
	}

	resp := clientset.CoreV1().Services(service.Namespace).ProxyGet(
		"http",
		service.Name,
		fmt.Sprintf("%d", service.Spec.Ports[0].Port),
		fmt.Sprintf("/pod/%s/ns/%s/logbucket/%d", opts.Pod, opts.Namespace, opts.Timestamp),
		nil,
	)

	rawQuery, err := resp.DoRaw(context.TODO())

	if err != nil {
		return nil, err
	}

	return parseQuery(rawQuery)
}

type AgentResp struct {
	Logs          []string `json:"logs"`
	MatchedBucket int      `json:"matchedBucket"`
}

func parseQuery(rawQuery []byte) (*AgentResp, error) {
	resp := &AgentResp{}

	err := json.Unmarshal(rawQuery, resp)

	if err != nil {
		return nil, err
	}

	return resp, nil
}
