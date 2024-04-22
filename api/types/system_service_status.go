package types

import (
	"errors"
	"fmt"
	"time"

	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"
)

// InvolvedObjectType is the k8s object the service runs
// it has to be one of deplouyment, statefulset or daemonset
type InvolvedObjectType string

const (
	//  ServiceDeployment is a service that runs as a deployment
	ServiceDeployment InvolvedObjectType = "deployment"
	//  ServiceStatefulSet is a service that runs as a statefulset
	ServiceStatefulSet InvolvedObjectType = "statefulset"
	// ServiceDaemonSet is a service that runs as a daemonset
	ServiceDaemonSet InvolvedObjectType = "daemonset"
)

func toInternalInvolvedObjectType(apiType porterv1.InvolvedObjectType) InvolvedObjectType {
	switch apiType {
	case porterv1.InvolvedObjectType_INVOLVED_OBJECT_TYPE_DEPLOYMENT:
		return ServiceDeployment
	case porterv1.InvolvedObjectType_INVOLVED_OBJECT_TYPE_STATEFULSET:
		return ServiceStatefulSet
	case porterv1.InvolvedObjectType_INVOLVED_OBJECT_TYPE_DAEMONSET:
		return ServiceDaemonSet
	default:
		return ""
	}
}

// Status is the status of a system service
type Status string

const (
	// Healthy is the status of a system service when it is fully healthy
	Healthy Status = "healthy"
	// PartialFailure is the status of a system service when it is partially failing
	PartialFailure Status = "partial_failure"
	// Failure is the status of a system service when it is critically in failure mode
	Failure Status = "failure"
	// Undefined is the status of a system service when it is in an undefined state
	Undefined Status = "undefined"
)

func toStatus(apiStatus porterv1.Status) Status {
	switch apiStatus {
	case porterv1.Status_STATUS_HEALTHY:
		return Healthy
	case porterv1.Status_STATUS_PARTIAL_FAILURE:
		return PartialFailure
	case porterv1.Status_STATUS_FAILURE:
		return Failure
	default:
		return Undefined
	}
}

// ClusterHealthType is the type of health check on the cluster that a history is generated from
type ClusterHealthType string

const (
	// Connected is the health history from for checking if the cluster is connected
	Connected ClusterHealthType = "connected"

	// Pingable is the health history from for checking if the cluster is pingable
	Pingable ClusterHealthType = "pingable"

	// MetricsHealthy is the health history from for checking if the cluster metrics are healthy
	MetricsHealthy ClusterHealthType = "metrics_healthy"
)

func toClusterHealthType(clusterHealthType porterv1.ClusterHealthType) (ClusterHealthType, error) {
	switch clusterHealthType {
	case porterv1.ClusterHealthType_CLUSTER_HEALTH_TYPE_CONNECTED:
		return Connected, nil
	case porterv1.ClusterHealthType_CLUSTER_HEALTH_TYPE_PINGABLE:
		return Pingable, nil
	case porterv1.ClusterHealthType_CLUSTER_HEALTH_TYPE_METRICS_HEALTHY:
		return MetricsHealthy, nil
	default:
		return "", errors.New("unknown cluster health type")
	}
}

// SystemService identifies a system service
type SystemService struct {
	Name               string             `json:"name"`
	Namespace          string             `json:"namespace"`
	InvolvedObjectType InvolvedObjectType `json:"involved_object_type"`
}

func toSystemService(apiSystemService *porterv1.SystemService) (SystemService, error) {
	if apiSystemService == nil {
		return SystemService{}, errors.New("unexpected nil: SystemService")
	}
	return SystemService{
		Name:               apiSystemService.Name,
		Namespace:          apiSystemService.Namespace,
		InvolvedObjectType: toInternalInvolvedObjectType(apiSystemService.InvolvedObjectType),
	}, nil
}

// HealthStatus is the status over a certain period of time
type HealthStatus struct {
	StartTime   time.Time  `json:"start_time"`
	EndTime     *time.Time `json:"end_time,omitempty"`
	Status      Status     `json:"status"`
	Description string     `json:"description,omitempty"`
}

// DailyHealthStatus contains the  health status of a system service or cluster over one day
type DailyHealthStatus struct {
	StatusPercentages map[Status]float32 `json:"status_percentages,omitempty"`
	HealthStatuses    []*HealthStatus    `json:"health_statuses,omitempty"`
}

// toDailyHealthStatus converts from the proto  DailyHealthStatus to the local DailyHealthStatus
func toDailyHealthStatus(protoDailyHealthStatus *porterv1.DailyHealthStatus) DailyHealthStatus {
	dailyHealthStatus := DailyHealthStatus{
		StatusPercentages: map[Status]float32{},
		HealthStatuses:    make([]*HealthStatus, 0),
	}
	for _, statusPercentage := range protoDailyHealthStatus.StatusPercentages {
		dailyHealthStatus.StatusPercentages[toStatus(statusPercentage.Status)] = statusPercentage.Percentage
	}
	for _, healthStatus := range protoDailyHealthStatus.HealthStatuses {
		var endTime *time.Time = nil
		if healthStatus.EndTime != nil {
			endTimeTemp := healthStatus.EndTime.AsTime()
			endTime = &endTimeTemp
		}
		dailyHealthStatus.HealthStatuses = append(dailyHealthStatus.HealthStatuses, &HealthStatus{
			StartTime:   healthStatus.StartTime.AsTime(),
			EndTime:     endTime,
			Status:      toStatus(healthStatus.Status),
			Description: healthStatus.Description,
		})
	}
	return dailyHealthStatus
}

// SystemServiceStatusHistory contains the daily status history of a system service
type SystemServiceStatusHistory struct {
	SystemService      SystemService               `json:"system_service"`
	DailyHealthHistory map[int32]DailyHealthStatus `json:"daily_health_history,omitempty"`
}

func toSystemServiceStatusHistory(protoSystemServiceStatusHistory *porterv1.SystemServiceStatusHistory) (SystemServiceStatusHistory, error) {
	if protoSystemServiceStatusHistory == nil {
		return SystemServiceStatusHistory{}, errors.New("unexpected nil: SystemServiceStatusHistory")
	}
	systemService, err := toSystemService(protoSystemServiceStatusHistory.SystemService)
	if err != nil {
		return SystemServiceStatusHistory{}, err
	}
	resp := SystemServiceStatusHistory{
		SystemService:      systemService,
		DailyHealthHistory: map[int32]DailyHealthStatus{},
	}
	for day, protoDailyHealthStatus := range protoSystemServiceStatusHistory.DailyStatusHistory {
		resp.DailyHealthHistory[day] = toDailyHealthStatus(protoDailyHealthStatus)
	}
	return resp, nil
}

// SystemStatusHistory contains the system infrastructure status for a cluster
type SystemStatusHistory struct {
	ClusterStatusHistories       map[ClusterHealthType]map[int32]DailyHealthStatus `json:"cluster_status_histories,omitempty"`
	SystemServiceStatusHistories []SystemServiceStatusHistory                      `json:"system_service_status_histories,omitempty"`
}

// ToSystemStatusHistory converts the CCP resposne to the internal SystemStatusHistory
func ToSystemStatusHistory(apiResp *porterv1.SystemStatusHistoryResponse) (SystemStatusHistory, error) {
	if apiResp == nil {
		return SystemStatusHistory{}, fmt.Errorf("nil system service status response")
	}
	resp := SystemStatusHistory{
		ClusterStatusHistories:       map[ClusterHealthType]map[int32]DailyHealthStatus{},
		SystemServiceStatusHistories: []SystemServiceStatusHistory{},
	}
	fmt.Printf("system status histories responses count %d\n", len(apiResp.SystemServiceStatusHistories))
	fmt.Printf("cluter status histories responses count %d\n", len(apiResp.ClusterStatusHistories))
	for _, clusterHealthHistory := range apiResp.ClusterStatusHistories {
		clusterHealthType, err := toClusterHealthType(clusterHealthHistory.ClusterHealthType)
		if err != nil {
			return resp, fmt.Errorf("unknown cluster health type: %s", clusterHealthHistory.ClusterHealthType)
		}
		// We don't expect duplicate cluster health types in the output, thus this should be safe
		resp.ClusterStatusHistories[clusterHealthType] = map[int32]DailyHealthStatus{}
		for day, protoDailyHealthStatus := range clusterHealthHistory.DailyStatusHistory {
			dailyHealthStatus := toDailyHealthStatus(protoDailyHealthStatus)
			resp.ClusterStatusHistories[clusterHealthType][day] = dailyHealthStatus
		}
	}
	for _, apiServiceStatusHistory := range apiResp.SystemServiceStatusHistories {
		statusHistory, err := toSystemServiceStatusHistory(apiServiceStatusHistory)
		if err != nil {
			return resp, err
		}
		resp.SystemServiceStatusHistories = append(resp.SystemServiceStatusHistories, statusHistory)
	}
	return resp, nil
}
