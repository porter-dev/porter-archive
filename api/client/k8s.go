package client

import (
	"context"
	"fmt"

	"github.com/porter-dev/porter/api/types"
	v1 "k8s.io/api/batch/v1"
)

// GetK8sNamespaces gets a namespaces list in a k8s cluster
func (c *Client) GetK8sNamespaces(
	ctx context.Context,
	projectID uint,
	clusterID uint,
) (*types.ListNamespacesResponse, error) {
	resp := &types.ListNamespacesResponse{}

	err := c.getRequest(
		fmt.Sprintf(
			"/projects/%d/clusters/%d/namespaces",
			projectID, clusterID,
		),
		nil,
		resp,
	)

	return resp, err
}

// CreateNewK8sNamespace creates a new namespace in a k8s cluster
func (c *Client) CreateNewK8sNamespace(
	ctx context.Context,
	projectID uint,
	clusterID uint,
	name string,
) (*types.CreateNamespaceResponse, error) {
	resp := &types.CreateNamespaceResponse{}

	err := c.postRequest(
		fmt.Sprintf(
			"/projects/%d/clusters/%d/namespaces/create",
			projectID, clusterID,
		),
		&types.CreateNamespaceRequest{
			Name: name,
		},
		resp,
	)

	return resp, err
}

func (c *Client) GetKubeconfig(
	ctx context.Context,
	projectID uint,
	clusterID uint,
) (*types.GetTemporaryKubeconfigResponse, error) {
	resp := &types.GetTemporaryKubeconfigResponse{}

	err := c.getRequest(
		fmt.Sprintf(
			"/projects/%d/clusters/%d/kubeconfig",
			projectID, clusterID,
		),
		nil,
		resp,
	)

	return resp, err
}

func (c *Client) GetEnvGroup(
	ctx context.Context,
	projectID, clusterID uint,
	namespace string,
	req *types.GetEnvGroupRequest,
) (*types.EnvGroup, error) {
	resp := &types.EnvGroup{}

	err := c.getRequest(
		fmt.Sprintf(
			"/projects/%d/clusters/%d/namespaces/%s/envgroup",
			projectID, clusterID,
			namespace,
		),
		req,
		resp,
	)

	return resp, err
}

func (c *Client) GetRelease(
	ctx context.Context,
	projectID, clusterID uint,
	namespace, name string,
) (*types.GetReleaseResponse, error) {
	resp := &types.GetReleaseResponse{}

	err := c.getRequest(
		fmt.Sprintf(
			"/projects/%d/clusters/%d/namespaces/%s/releases/%s/0",
			projectID, clusterID,
			namespace, name,
		),
		nil,
		resp,
	)

	return resp, err
}

func (c *Client) GetJobs(
	ctx context.Context,
	projectID, clusterID uint,
	namespace, name string,
) ([]v1.Job, error) {
	respArr := make([]v1.Job, 0)

	resp := &respArr

	err := c.getRequest(
		fmt.Sprintf(
			"/projects/%d/clusters/%d/namespaces/%s/releases/%s/0/jobs",
			projectID, clusterID,
			namespace, name,
		),
		nil,
		resp,
	)

	return *resp, err
}

// GetK8sAllPods gets all pods for a given release
func (c *Client) GetK8sAllPods(
	ctx context.Context,
	projectID, clusterID uint,
	namespace, name string,
) (*types.GetReleaseAllPodsResponse, error) {
	resp := &types.GetReleaseAllPodsResponse{}

	err := c.getRequest(
		fmt.Sprintf(
			"/projects/%d/clusters/%d/namespaces/%s/releases/%s/0/pods/all",
			projectID, clusterID,
			namespace, name,
		),
		nil,
		resp,
	)

	return resp, err
}
