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
	vals := make(map[string]string)

	if req.Status != nil {
		vals["status"] = string(*req.Status)
	}

	if req.ReleaseName != nil {
		vals["release_name"] = *req.ReleaseName
	}

	if req.ReleaseNamespace != nil {
		vals["release_namespace"] = *req.ReleaseNamespace
	}

	if req.PaginationRequest != nil {
		vals["page"] = fmt.Sprintf("%d", req.PaginationRequest.Page)
	}

	resp := clientset.CoreV1().Services(service.Namespace).ProxyGet(
		"http",
		service.Name,
		fmt.Sprintf("%d", service.Spec.Ports[0].Port),
		"/incidents",
		vals,
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

func ListIncidentEvents(
	clientset kubernetes.Interface,
	service *v1.Service,
	incidentID string,
	req *types.ListIncidentEventsRequest,
) (*types.ListIncidentEventsResponse, error) {
	vals := make(map[string]string)

	if req.PodName != nil {
		vals["pod_name"] = *req.PodName
	}

	if req.PodNamespace != nil {
		vals["pod_namespace"] = *req.PodNamespace
	}

	if req.Summary != nil {
		vals["summary"] = *req.Summary
	}
	if req.PaginationRequest != nil {
		vals["page"] = fmt.Sprintf("%d", req.PaginationRequest.Page)
	}

	resp := clientset.CoreV1().Services(service.Namespace).ProxyGet(
		"http",
		service.Name,
		fmt.Sprintf("%d", service.Spec.Ports[0].Port),
		fmt.Sprintf("/incidents/%s/events", incidentID),
		vals,
	)

	rawQuery, err := resp.DoRaw(context.Background())
	if err != nil {
		return nil, err
	}

	events := &types.ListIncidentEventsResponse{}

	if err := json.Unmarshal(rawQuery, events); err != nil {
		return nil, err
	}

	return events, nil
}

func GetHistoricalLogs(
	clientset kubernetes.Interface,
	service *v1.Service,
	req *types.GetLogRequest,
) (*types.GetLogResponse, error) {
	vals := make(map[string]string)

	if req.Limit != 0 {
		vals["limit"] = fmt.Sprintf("%d", req.Limit)
	}

	if req.StartRange != nil {
		startVal, err := req.StartRange.MarshalText()

		if err != nil {
			return nil, err
		}

		vals["start_range"] = string(startVal)
	}

	if req.EndRange != nil {
		endVal, err := req.EndRange.MarshalText()

		if err != nil {
			return nil, err
		}

		vals["end_range"] = string(endVal)
	}

	vals["pod_selector"] = req.PodSelector
	vals["namespace"] = req.Namespace

	resp := clientset.CoreV1().Services(service.Namespace).ProxyGet(
		"http",
		service.Name,
		fmt.Sprintf("%d", service.Spec.Ports[0].Port),
		"/logs",
		vals,
	)

	rawQuery, err := resp.DoRaw(context.Background())
	if err != nil {
		return nil, err
	}

	logsResp := &types.GetLogResponse{}

	err = json.Unmarshal(rawQuery, logsResp)
	if err != nil {
		return nil, err
	}

	return logsResp, nil
}

func GetHistoricalEvents(
	clientset kubernetes.Interface,
	service *v1.Service,
	req *types.GetEventRequest,
) (*types.GetEventResponse, error) {
	vals := make(map[string]string)

	if req.Limit != 0 {
		vals["limit"] = fmt.Sprintf("%d", req.Limit)
	}

	if req.StartRange != nil {
		startVal, err := req.StartRange.MarshalText()

		if err != nil {
			return nil, err
		}

		vals["start_range"] = string(startVal)
	}

	if req.EndRange != nil {
		endVal, err := req.EndRange.MarshalText()

		if err != nil {
			return nil, err
		}

		vals["end_range"] = string(endVal)
	}

	vals["pod_selector"] = req.PodSelector
	vals["namespace"] = req.Namespace

	resp := clientset.CoreV1().Services(service.Namespace).ProxyGet(
		"http",
		service.Name,
		fmt.Sprintf("%d", service.Spec.Ports[0].Port),
		"/events",
		vals,
	)

	rawQuery, err := resp.DoRaw(context.Background())
	if err != nil {
		return nil, err
	}

	eventsResp := &types.GetEventResponse{}

	err = json.Unmarshal(rawQuery, eventsResp)
	if err != nil {
		return nil, err
	}

	return eventsResp, nil
}
