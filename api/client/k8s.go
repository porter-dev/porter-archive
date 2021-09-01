package client

import (
	"context"
	"fmt"
	"net/http"
	"net/url"

	"github.com/porter-dev/porter/server/api"
	v1 "k8s.io/api/core/v1"
)

// GetK8sNamespacesResponse is the list of namespaces returned when a
// user has successfully authenticated
type GetK8sNamespacesResponse v1.NamespaceList

// GetK8sNamespaces gets a namespaces list in a k8s cluster
func (c *Client) GetK8sNamespaces(
	ctx context.Context,
	projectID uint,
	clusterID uint,
) (*GetK8sNamespacesResponse, error) {
	req, err := http.NewRequest(
		"GET",
		fmt.Sprintf("%s/projects/%d/clusters/%d/namespaces", c.BaseURL, projectID, clusterID),
		nil,
	)

	if err != nil {
		return nil, err
	}

	req = req.WithContext(ctx)
	bodyResp := &GetK8sNamespacesResponse{}

	if httpErr, err := c.sendRequest(req, bodyResp, true); httpErr != nil || err != nil {
		if httpErr != nil {
			return nil, fmt.Errorf("code %d, errors %v", httpErr.Code, httpErr.Errors)
		}

		return nil, err
	}

	return bodyResp, nil
}

// GetKubeconfigResponse is the list of namespaces returned when a
// user has successfully authenticated
type GetKubeconfigResponse struct {
	Kubeconfig []byte `json:"kubeconfig"`
}

// GetK8sNamespaces gets a namespaces list in a k8s cluster
func (c *Client) GetKubeconfig(
	ctx context.Context,
	projectID uint,
	clusterID uint,
) (*GetKubeconfigResponse, error) {
	req, err := http.NewRequest(
		"GET",
		fmt.Sprintf("%s/projects/%d/clusters/%d/kubeconfig", c.BaseURL, projectID, clusterID),
		nil,
	)

	if err != nil {
		return nil, err
	}

	req = req.WithContext(ctx)
	bodyResp := &GetKubeconfigResponse{}

	if httpErr, err := c.sendRequest(req, bodyResp, true); httpErr != nil || err != nil {
		if httpErr != nil {
			return nil, fmt.Errorf("code %d, errors %v", httpErr.Code, httpErr.Errors)
		}

		return nil, err
	}

	return bodyResp, nil
}

// GetReleaseLatestRevision gets the latest revision of a Helm release
type GetReleaseResponse api.PorterRelease

// GetK8sAllPods gets all pods for a given release
func (c *Client) GetRelease(
	ctx context.Context,
	projectID, clusterID uint,
	namespace, name string,
) (*GetReleaseResponse, error) {
	cl := fmt.Sprintf("%d", clusterID)

	req, err := http.NewRequest(
		"GET",
		fmt.Sprintf("%s/projects/%d/releases/%s/0?"+url.Values{
			"cluster_id": []string{cl},
			"namespace":  []string{namespace},
			"storage":    []string{"secret"},
		}.Encode(), c.BaseURL, projectID, name),
		nil,
	)

	if err != nil {
		return nil, err
	}

	req = req.WithContext(ctx)
	bodyResp := &GetReleaseResponse{}

	if httpErr, err := c.sendRequest(req, bodyResp, true); httpErr != nil || err != nil {
		if httpErr != nil {
			return nil, fmt.Errorf("code %d, errors %v", httpErr.Code, httpErr.Errors)
		}

		return nil, err
	}

	return bodyResp, nil
}

// GetReleaseAllPodsResponse is the list of all pods for a given Helm release
type GetReleaseAllPodsResponse []v1.Pod

// GetK8sAllPods gets all pods for a given release
func (c *Client) GetK8sAllPods(
	ctx context.Context,
	projectID, clusterID uint,
	namespace, name string,
) (GetReleaseAllPodsResponse, error) {
	req, err := http.NewRequest(
		"GET",
		fmt.Sprintf("%s/projects/%d/clusters/%d/namespaces/%s/releases/%s/0/pods/all", c.BaseURL, projectID, clusterID, namespace, name),
		nil,
	)

	if err != nil {
		return nil, err
	}

	req = req.WithContext(ctx)
	bodyResp := &GetReleaseAllPodsResponse{}

	if httpErr, err := c.sendRequest(req, bodyResp, true); httpErr != nil || err != nil {
		if httpErr != nil {
			return nil, fmt.Errorf("code %d, errors %v", httpErr.Code, httpErr.Errors)
		}

		return nil, err
	}

	return *bodyResp, nil
}
