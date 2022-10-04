package v2

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

func GetAllIncidents(
	clientset kubernetes.Interface,
	service *v1.Service,
) (*ListIncidentsResponse, error) {
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

	incidentsResp := &ListIncidentsResponse{}

	err = json.Unmarshal(rawQuery, incidentsResp)
	if err != nil {
		return nil, err
	}

	return incidentsResp, nil
}

// func GetIncidentEventsByID(
// 	clientset kubernetes.Interface,
// 	service *v1.Service,
// 	incidentID string,
// ) (*EventsResponse, error) {
// 	resp := clientset.CoreV1().Services(service.Namespace).ProxyGet(
// 		"http",
// 		service.Name,
// 		fmt.Sprintf("%d", service.Spec.Ports[0].Port),
// 		fmt.Sprintf("/incidents/%s", incidentID),
// 		nil,
// 	)

// 	rawQuery, err := resp.DoRaw(context.Background())
// 	if err != nil {
// 		return nil, err
// 	}

// 	eventsResp := &EventsResponse{}

// 	err = json.Unmarshal(rawQuery, eventsResp)
// 	if err != nil {
// 		return nil, err
// 	}

// 	return eventsResp, nil
// }

// func GetIncidentsByReleaseNamespace(
// 	clientset kubernetes.Interface,
// 	service *v1.Service,
// 	releaseName, namespace string,
// ) (*IncidentsResponse, error) {
// 	resp := clientset.CoreV1().Services(service.Namespace).ProxyGet(
// 		"http",
// 		service.Name,
// 		fmt.Sprintf("%d", service.Spec.Ports[0].Port),
// 		fmt.Sprintf("/incidents/namespaces/%s/releases/%s", namespace, releaseName),
// 		nil,
// 	)

// 	rawQuery, err := resp.DoRaw(context.Background())
// 	if err != nil {
// 		return nil, err
// 	}

// 	incidentsResp := &IncidentsResponse{}

// 	err = json.Unmarshal(rawQuery, incidentsResp)
// 	if err != nil {
// 		return nil, err
// 	}

// 	return incidentsResp, nil
// }

// func GetLogs(
// 	clientset kubernetes.Interface,
// 	service *v1.Service,
// 	logID string,
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
