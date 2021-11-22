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

type LogPathOpts struct {
	Timestamp int
	Pod       string
	Namespace string
}

func GetLogsFromPorterAgent(
	clientset kubernetes.Interface,
	service *v1.Service,
	opts *LogPathOpts,
) (*AgentLogsResp, error) {
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

	return parseLogQuery(rawQuery)
}

type LogBucketPathOpts struct {
	Pod       string
	Namespace string
}

func GetLogBucketsFromPorterAgent(
	clientset kubernetes.Interface,
	service *v1.Service,
	opts *LogBucketPathOpts,
) (*AgentLogBucketsResp, error) {
	if len(service.Spec.Ports) == 0 {
		return nil, fmt.Errorf("agent service has no exposed ports to query")
	}

	resp := clientset.CoreV1().Services(service.Namespace).ProxyGet(
		"http",
		service.Name,
		fmt.Sprintf("%d", service.Spec.Ports[0].Port),
		fmt.Sprintf("/pod/%s/ns/%s/logbucket", opts.Pod, opts.Namespace),
		nil,
	)

	rawQuery, err := resp.DoRaw(context.TODO())

	if err != nil {
		return nil, err
	}

	return parseLogBucketsQuery(rawQuery)
}

type AgentLogsResp struct {
	Logs          []string `json:"logs"`
	MatchedBucket string   `json:"matchedBucket"`
	Error         string   `json:"error"`
}

func parseLogQuery(rawQuery []byte) (*AgentLogsResp, error) {
	resp := &AgentLogsResp{}

	err := json.Unmarshal(rawQuery, resp)

	if err != nil {
		return nil, err
	}

	return resp, nil
}

type AgentLogBucketsResp struct {
	AvailableBuckets []string `json:"availableLogBuckets"`
	Error            string   `json:"error"`
}

func parseLogBucketsQuery(rawQuery []byte) (*AgentLogBucketsResp, error) {
	resp := &AgentLogBucketsResp{}

	err := json.Unmarshal(rawQuery, resp)

	if err != nil {
		return nil, err
	}

	return resp, nil
}
