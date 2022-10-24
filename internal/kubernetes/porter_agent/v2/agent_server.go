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

func ListPorterEvents(
	clientset kubernetes.Interface,
	service *v1.Service,
	req *types.ListEventsRequest,
) (*types.ListEventsResponse, error) {
	vals := make(map[string]string)

	if req.Type != nil {
		vals["type"] = *req.Type
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
		"/events",
		vals,
	)

	rawQuery, err := resp.DoRaw(context.Background())
	if err != nil {
		return nil, err
	}

	eventsResp := &types.ListEventsResponse{}

	err = json.Unmarshal(rawQuery, eventsResp)
	if err != nil {
		return nil, err
	}

	return eventsResp, nil
}

func ListPorterJobEvents(
	clientset kubernetes.Interface,
	service *v1.Service,
	req *types.ListJobEventsRequest,
) (*types.ListEventsResponse, error) {
	vals := make(map[string]string)

	vals["job_name"] = req.JobName

	if req.Type != nil {
		vals["type"] = *req.Type
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
		"/events/job",
		vals,
	)

	rawQuery, err := resp.DoRaw(context.Background())
	if err != nil {
		return nil, err
	}

	eventsResp := &types.ListEventsResponse{}

	err = json.Unmarshal(rawQuery, eventsResp)
	if err != nil {
		return nil, err
	}

	return eventsResp, nil
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
	req *types.ListIncidentEventsRequest,
) (*types.ListIncidentEventsResponse, error) {
	vals := make(map[string]string)

	if req.IncidentID != nil {
		vals["incident_id"] = *req.IncidentID
	}

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

	if req.PodPrefix != nil {
		vals["pod_prefix"] = *req.PodPrefix
	}

	resp := clientset.CoreV1().Services(service.Namespace).ProxyGet(
		"http",
		service.Name,
		fmt.Sprintf("%d", service.Spec.Ports[0].Port),
		"/incidents/events",
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
	vals["revision"] = req.Revision

	if req.SearchParam != "" {
		vals["search_param"] = req.SearchParam
	}

	if req.Direction != "" {
		vals["direction"] = req.Direction
	}

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

func GetPodValues(
	clientset kubernetes.Interface,
	service *v1.Service,
	req *types.GetPodValuesRequest,
) ([]string, error) {
	vals := make(map[string]string)

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

	vals["match_prefix"] = req.MatchPrefix
	vals["revision"] = req.Revision
	vals["namespace"] = req.Namespace

	resp := clientset.CoreV1().Services(service.Namespace).ProxyGet(
		"http",
		service.Name,
		fmt.Sprintf("%d", service.Spec.Ports[0].Port),
		"/logs/pod_values",
		vals,
	)

	rawQuery, err := resp.DoRaw(context.Background())
	if err != nil {
		return nil, err
	}

	valsResp := make([]string, 0)

	err = json.Unmarshal(rawQuery, &valsResp)
	if err != nil {
		return nil, err
	}

	return valsResp, nil
}

func GetRevisionValues(
	clientset kubernetes.Interface,
	service *v1.Service,
	req *types.GetRevisionValuesRequest,
) ([]string, error) {
	vals := make(map[string]string)

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

	vals["match_prefix"] = req.MatchPrefix

	resp := clientset.CoreV1().Services(service.Namespace).ProxyGet(
		"http",
		service.Name,
		fmt.Sprintf("%d", service.Spec.Ports[0].Port),
		"/logs/revision_values",
		vals,
	)

	rawQuery, err := resp.DoRaw(context.Background())
	if err != nil {
		return nil, err
	}

	valsResp := make([]string, 0)

	err = json.Unmarshal(rawQuery, &valsResp)
	if err != nil {
		return nil, err
	}

	return valsResp, nil
}

func GetHistoricalKubernetesEvents(
	clientset kubernetes.Interface,
	service *v1.Service,
	req *types.GetKubernetesEventRequest,
) (*types.GetKubernetesEventResponse, error) {
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

	eventsResp := &types.GetKubernetesEventResponse{}

	err = json.Unmarshal(rawQuery, eventsResp)
	if err != nil {
		return nil, err
	}

	return eventsResp, nil
}

func GetAgentStatus(
	clientset kubernetes.Interface,
	service *v1.Service,
) (*types.GetAgentStatusResponse, error) {
	resp := clientset.CoreV1().Services(service.Namespace).ProxyGet(
		"http",
		service.Name,
		fmt.Sprintf("%d", service.Spec.Ports[0].Port),
		"/status",
		nil,
	)

	rawQuery, err := resp.DoRaw(context.Background())
	if err != nil {
		return nil, err
	}

	statusResp := &types.GetAgentStatusResponse{}

	err = json.Unmarshal(rawQuery, statusResp)
	if err != nil {
		return nil, err
	}

	return statusResp, nil
}
