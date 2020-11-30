package api

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/porter-dev/porter/internal/registry"

	"github.com/porter-dev/porter/internal/models"
)

// CreateECRRequest represents the accepted fields for creating
// an ECR registry
type CreateECRRequest struct {
	Name             string `json:"name"`
	AWSIntegrationID uint   `json:"aws_integration_id"`
}

// CreateECRResponse is the resulting registry after creation
type CreateECRResponse models.RegistryExternal

// CreateECR creates an Elastic Container Registry integration
func (c *Client) CreateECR(
	ctx context.Context,
	projectID uint,
	createECR *CreateECRRequest,
) (*CreateECRResponse, error) {
	data, err := json.Marshal(createECR)

	if err != nil {
		return nil, err
	}

	req, err := http.NewRequest(
		"POST",
		fmt.Sprintf("%s/projects/%d/registries", c.BaseURL, projectID),
		strings.NewReader(string(data)),
	)

	if err != nil {
		return nil, err
	}

	req = req.WithContext(ctx)
	bodyResp := &CreateECRResponse{}

	if httpErr, err := c.sendRequest(req, bodyResp, true); httpErr != nil || err != nil {
		if httpErr != nil {
			return nil, fmt.Errorf("code %d, errors %v", httpErr.Code, httpErr.Errors)
		}

		return nil, err
	}

	return bodyResp, nil
}

// CreateGCRRequest represents the accepted fields for creating
// a GCR registry
type CreateGCRRequest struct {
	Name             string `json:"name"`
	GCPIntegrationID uint   `json:"gcp_integration_id"`
}

// CreateGCRResponse is the resulting registry after creation
type CreateGCRResponse models.RegistryExternal

// CreateGCR creates an Google Container Registry integration
func (c *Client) CreateGCR(
	ctx context.Context,
	projectID uint,
	createGCR *CreateGCRRequest,
) (*CreateGCRResponse, error) {
	data, err := json.Marshal(createGCR)

	if err != nil {
		return nil, err
	}

	req, err := http.NewRequest(
		"POST",
		fmt.Sprintf("%s/projects/%d/registries", c.BaseURL, projectID),
		strings.NewReader(string(data)),
	)

	if err != nil {
		return nil, err
	}

	req = req.WithContext(ctx)
	bodyResp := &CreateGCRResponse{}

	if httpErr, err := c.sendRequest(req, bodyResp, true); httpErr != nil || err != nil {
		if httpErr != nil {
			return nil, fmt.Errorf("code %d, errors %v", httpErr.Code, httpErr.Errors)
		}

		return nil, err
	}

	return bodyResp, nil
}

// ListRegistryRepositoryResponse is the list of repositories in a registry
type ListRegistryRepositoryResponse []registry.Repository

// ListRegistryRepositories lists the repositories in a registry
func (c *Client) ListRegistryRepositories(
	ctx context.Context,
	projectID uint,
	registryID uint,
) (ListRegistryRepositoryResponse, error) {
	req, err := http.NewRequest(
		"GET",
		fmt.Sprintf("%s/projects/%d/registries/%d/repositories", c.BaseURL, projectID, registryID),
		nil,
	)

	if err != nil {
		return nil, err
	}

	req = req.WithContext(ctx)
	bodyResp := &ListRegistryRepositoryResponse{}

	if httpErr, err := c.sendRequest(req, bodyResp, true); httpErr != nil || err != nil {
		if httpErr != nil {
			return nil, fmt.Errorf("code %d, errors %v", httpErr.Code, httpErr.Errors)
		}

		return nil, err
	}

	return *bodyResp, nil
}
