package v2

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/porter-dev/porter/api/types"
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

func ListIncidents(
	clientset kubernetes.Interface,
	service *v1.Service,
	req *types.ListIncidentsRequest,
) (*types.ListIncidentsResponse, error) {
	resp := clientset.CoreV1().Services(service.Namespace).ProxyGet(
		"http",
		service.Name,
		fmt.Sprintf("%d", service.Spec.Ports[0].Port),
		"/incidents",
		nil,
	)

	rawQuery, err := resp.DoRaw(context.Background())
	if err != nil {
		return nil, err
	}

	incidentsResp := &types.ListIncidentsResponse{}

	err = json.Unmarshal(rawQuery, incidentsResp)
	if err != nil {
		return nil, err
	}

	return incidentsResp, nil
}

func GetIncidentByID(
	clientset kubernetes.Interface,
	service *v1.Service,
	incidentID string,
) (*types.Incident, error) {
	resp := clientset.CoreV1().Services(service.Namespace).ProxyGet(
		"http",
		service.Name,
		fmt.Sprintf("%d", service.Spec.Ports[0].Port),
		fmt.Sprintf("/incidents/%s", incidentID),
		nil,
	)

	rawQuery, err := resp.DoRaw(context.Background())
	if err != nil {
		return nil, err
	}

	incident := &types.Incident{}

	if err := json.Unmarshal(rawQuery, incident); err != nil {
		return nil, err
	}

	return incident, nil
}

// func GetHistoricalLogs(
// 	clientset kubernetes.Interface,
// 	service *v1.Service,
// 	req *GetLogRequest,
// ) (*LogsResponse, error) {
// 	resp := clientset.CoreV1().Services(service.Namespace).ProxyGet(
// 		"http",
// 		service.Name,
// 		fmt.Sprintf("%d", service.Spec.Ports[0].Port),
// 		fmt.Sprintf("/incidents/logs/%s", logID),
// 		nil,
// 	)

// 	rawQuery, err := resp.DoRaw(context.Background())
// 	if err != nil {
// 		return nil, err
// 	}

// 	logsResp := &LogsResponse{}

// 	err = json.Unmarshal(rawQuery, logsResp)
// 	if err != nil {
// 		return nil, err
// 	}

// 	return logsResp, nil
// }
