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

// Status is the status of a service
// it has to be one of healthy, partial_failure or failure
type Status string

const (
	// StatusHealthy is when a service is fully healthy
	StatusHealthy Status = "healthy"
	// StatusPartialFailure is when a service is partially failing
	StatusPartialFailure Status = "partial_failure"
	// StatusFailure is when a service is critically in failure mode
	StatusFailure Status = "failure"
)

// SystemServicesStatus contains the system infrastructure status for a cluster
type SystemStatusHistory struct {
	// ClusterStatusHistory is a time series of the cluster's health
	ClusterStatusHistory []ClusterHealthStatus `json:"cluster_status_history"`
	// SystemServiceStatusHistories is a list of SystemServiceStatusHistory for each service
	// there should be only one entry for a service
	SystemServiceStatusHistories []SystemServiceStatusHistory `json:"system_service_status_histories"`
}

// ClusterHealthStatus is the status of a cluster at a certain timestamp
type ClusterHealthStatus struct {
	Timestamp time.Time `json:"timestamp"`
	// Responsive is set to true if the cluster sent all heartbeats in the time period represented by the Timestamp
	Responsive bool `json:"responsive"`
}

// SystemServiceStatusHistory contains the status of a system service
type SystemServiceStatusHistory struct {
	SystemService SystemService   `json:"system_service"`
	StatusHistory []ServiceStatus `json:"status_history"`
}

// SystemService identifies a system service
type SystemService struct {
	Name               string             `json:"name"`
	Namespace          string             `json:"namespace"`
	InvolvedObjectType InvolvedObjectType `json:"involved_object_type"`
}

type ServiceStatus struct {
	Timestamp time.Time `json:"timestamp"`
	Status    Status    `json:"status"`
}

// ToSystemStatusHistory converts the CCP resposne to the internal SystemStatusHistory
func ToSystemStatusHistory(apiResp *porterv1.SystemStatusHistoryResponse) (SystemStatusHistory, error) {
	if apiResp == nil {
		return SystemStatusHistory{}, fmt.Errorf("nil system service status response")
	}
	resp := SystemStatusHistory{
		ClusterStatusHistory:         []ClusterHealthStatus{},
		SystemServiceStatusHistories: []SystemServiceStatusHistory{},
	}
	for _, apiClusterStatus := range apiResp.ClusterStatusHistory {
		clusterHealthStatus, err := toClusterHealthStatus(apiClusterStatus)
		if err != nil {
			return resp, err
		}
		resp.ClusterStatusHistory = append(resp.ClusterStatusHistory, clusterHealthStatus)
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

func toClusterHealthStatus(apiClusterStatus *porterv1.ClusterStatus) (ClusterHealthStatus, error) {
	if apiClusterStatus == nil {
		return ClusterHealthStatus{}, errors.New("unexpected nil: ClusterStatus")
	}
	return ClusterHealthStatus{
		Timestamp:  apiClusterStatus.TimestampField.AsTime(),
		Responsive: apiClusterStatus.Responsive,
	}, nil
}

func toSystemServiceStatusHistory(apiServiceStatusHistory *porterv1.SystemServiceStatusHistory) (SystemServiceStatusHistory, error) {
	if apiServiceStatusHistory == nil {
		return SystemServiceStatusHistory{}, errors.New("unexpected nil: SystemServiceStatusHistory")
	}
	systemService, err := toSystemService(apiServiceStatusHistory.SystemService)
	if err != nil {
		return SystemServiceStatusHistory{}, err
	}
	resp := SystemServiceStatusHistory{
		SystemService: systemService,
		StatusHistory: []ServiceStatus{},
	}
	for _, apiStatus := range apiServiceStatusHistory.StatusHistory {
		status, err := toStatus(apiStatus.Status)
		if err != nil {
			return resp, err
		}
		resp.StatusHistory = append(resp.StatusHistory, ServiceStatus{
			Timestamp: apiStatus.TimestampField.AsTime(),
			Status:    status,
		})
	}
	return resp, nil
}

func toSystemService(apiSystemService *porterv1.SystemService) (SystemService, error) {
	if apiSystemService == nil {
		return SystemService{}, errors.New("unexpected nil: SystemService")
	}
	involvedObjectType, err := toInternalInvolvedObjectType(apiSystemService.InvolvedObjectType)
	if err != nil {
		return SystemService{}, err
	}
	return SystemService{
		Name:               apiSystemService.Name,
		Namespace:          apiSystemService.Namespace,
		InvolvedObjectType: involvedObjectType,
	}, nil
}

func toInternalInvolvedObjectType(apiType porterv1.InvolvedObjectType) (InvolvedObjectType, error) {
	switch apiType {
	case porterv1.InvolvedObjectType_INVOLVED_OBJECT_TYPE_DEPLOYMENT:
		return ServiceDeployment, nil
	case porterv1.InvolvedObjectType_INVOLVED_OBJECT_TYPE_STATEFULSET:
		return ServiceStatefulSet, nil
	case porterv1.InvolvedObjectType_INVOLVED_OBJECT_TYPE_DAEMONSET:
		return ServiceDaemonSet, nil
	default:
		return "", fmt.Errorf("unknown involved object type")
	}
}

func toStatus(apiStatus porterv1.Status) (Status, error) {
	switch apiStatus {
	case porterv1.Status_STATUS_HEALTHY:
		return StatusHealthy, nil
	case porterv1.Status_STATUS_PARTIAL_FAILURE:
		return StatusPartialFailure, nil
	case porterv1.Status_STATUS_FAILURE:
		return StatusFailure, nil
	default:
		return "", errors.New("unknown service status")
	}
}
