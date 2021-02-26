package api

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

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

// CreatePrivateRegistryRequest represents the accepted fields for creating
// a private registry
type CreatePrivateRegistryRequest struct {
	Name               string `json:"name"`
	URL                string `json:"url"`
	BasicIntegrationID uint   `json:"basic_integration_id"`
}

// CreatePrivateRegistryResponse is the resulting registry after creation
type CreatePrivateRegistryResponse models.RegistryExternal

// CreatePrivateRegistry creates a private registry integration
func (c *Client) CreatePrivateRegistry(
	ctx context.Context,
	projectID uint,
	createPR *CreatePrivateRegistryRequest,
) (*CreatePrivateRegistryResponse, error) {
	data, err := json.Marshal(createPR)

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
	bodyResp := &CreatePrivateRegistryResponse{}

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
	URL              string `json:"url"`
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

// CreateDOCRRequest represents the accepted fields for creating
// a DOCR registry
type CreateDOCRRequest struct {
	Name            string `json:"name"`
	DOIntegrationID uint   `json:"do_integration_id"`
	URL             string `json:"url"`
}

// CreateDOCRResponse is the resulting registry after creation
type CreateDOCRResponse models.RegistryExternal

// CreateDOCR creates an Digital Ocean Container Registry integration
func (c *Client) CreateDOCR(
	ctx context.Context,
	projectID uint,
	createDOCR *CreateDOCRRequest,
) (*CreateDOCRResponse, error) {
	data, err := json.Marshal(createDOCR)

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
	bodyResp := &CreateDOCRResponse{}

	if httpErr, err := c.sendRequest(req, bodyResp, true); httpErr != nil || err != nil {
		if httpErr != nil {
			return nil, fmt.Errorf("code %d, errors %v", httpErr.Code, httpErr.Errors)
		}

		return nil, err
	}

	return bodyResp, nil
}

// ListRegistryResponse is the list of registries for a project
type ListRegistryResponse []models.RegistryExternal

// ListRegistries returns a list of registries for a project
func (c *Client) ListRegistries(
	ctx context.Context,
	projectID uint,
) (ListRegistryResponse, error) {
	req, err := http.NewRequest(
		"GET",
		fmt.Sprintf("%s/projects/%d/registries", c.BaseURL, projectID),
		nil,
	)

	if err != nil {
		return nil, err
	}

	req = req.WithContext(ctx)
	bodyResp := &ListRegistryResponse{}

	if httpErr, err := c.sendRequest(req, bodyResp, true); httpErr != nil || err != nil {
		if httpErr != nil {
			return nil, fmt.Errorf("code %d, errors %v", httpErr.Code, httpErr.Errors)
		}

		return nil, err
	}

	return *bodyResp, nil
}

// DeleteProjectRegistry deletes a registry given a project id and registry id
func (c *Client) DeleteProjectRegistry(
	ctx context.Context,
	projectID uint,
	registryID uint,
) error {
	req, err := http.NewRequest(
		"DELETE",
		fmt.Sprintf("%s/projects/%d/registries/%d", c.BaseURL, projectID, registryID),
		nil,
	)

	if err != nil {
		return err
	}

	req = req.WithContext(ctx)

	if httpErr, err := c.sendRequest(req, nil, true); httpErr != nil || err != nil {
		if httpErr != nil {
			return fmt.Errorf("code %d, errors %v", httpErr.Code, httpErr.Errors)
		}

		return err
	}

	return nil
}

// GetTokenResponse blah
type GetTokenResponse struct {
	Token     string     `json:"token"`
	ExpiresAt *time.Time `json:"expires_at"`
}

// GetECRAuthorizationToken gets an ECR authorization token
func (c *Client) GetECRAuthorizationToken(
	ctx context.Context,
	projectID uint,
	region string,
) (*GetTokenResponse, error) {
	req, err := http.NewRequest(
		"GET",
		fmt.Sprintf("%s/projects/%d/registries/ecr/%s/token", c.BaseURL, projectID, region),
		nil,
	)

	if err != nil {
		return nil, err
	}

	bodyResp := &GetTokenResponse{}
	req = req.WithContext(ctx)

	if httpErr, err := c.sendRequest(req, bodyResp, true); httpErr != nil || err != nil {
		if httpErr != nil {
			return nil, fmt.Errorf("code %d, errors %v", httpErr.Code, httpErr.Errors)
		}

		return nil, err
	}

	return bodyResp, nil
}

type GetGCRTokenRequest struct {
	ServerURL string `json:"server_url"`
}

// GetGCRAuthorizationToken gets a GCR authorization token
func (c *Client) GetGCRAuthorizationToken(
	ctx context.Context,
	projectID uint,
	gcrRequest *GetGCRTokenRequest,
) (*GetTokenResponse, error) {
	data, err := json.Marshal(gcrRequest)

	if err != nil {
		return nil, err
	}

	req, err := http.NewRequest(
		"GET",
		fmt.Sprintf("%s/projects/%d/registries/gcr/token", c.BaseURL, projectID),
		strings.NewReader(string(data)),
	)

	if err != nil {
		return nil, err
	}

	bodyResp := &GetTokenResponse{}
	req = req.WithContext(ctx)

	if httpErr, err := c.sendRequest(req, bodyResp, true); httpErr != nil || err != nil {
		if httpErr != nil {
			return nil, fmt.Errorf("code %d, errors %v", httpErr.Code, httpErr.Errors)
		}

		return nil, err
	}

	return bodyResp, nil
}

// GetDockerhubAuthorizationToken gets a Docker Hub authorization token
func (c *Client) GetDockerhubAuthorizationToken(
	ctx context.Context,
	projectID uint,
) (*GetTokenResponse, error) {
	req, err := http.NewRequest(
		"GET",
		fmt.Sprintf("%s/projects/%d/registries/dockerhub/token", c.BaseURL, projectID),
		nil,
	)

	if err != nil {
		return nil, err
	}

	bodyResp := &GetTokenResponse{}
	req = req.WithContext(ctx)

	if httpErr, err := c.sendRequest(req, bodyResp, true); httpErr != nil || err != nil {
		if httpErr != nil {
			return nil, fmt.Errorf("code %d, errors %v", httpErr.Code, httpErr.Errors)
		}

		return nil, err
	}

	return bodyResp, nil
}

type GetDOCRTokenRequest struct {
	ServerURL string `json:"server_url"`
}

// GetDOCRAuthorizationToken gets a DOCR authorization token
func (c *Client) GetDOCRAuthorizationToken(
	ctx context.Context,
	projectID uint,
	docrRequest *GetDOCRTokenRequest,
) (*GetTokenResponse, error) {
	data, err := json.Marshal(docrRequest)

	if err != nil {
		return nil, err
	}

	req, err := http.NewRequest(
		"GET",
		fmt.Sprintf("%s/projects/%d/registries/docr/token", c.BaseURL, projectID),
		strings.NewReader(string(data)),
	)

	if err != nil {
		return nil, err
	}

	bodyResp := &GetTokenResponse{}
	req = req.WithContext(ctx)

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

// ListImagesResponse is the list of images in a repository
type ListImagesResponse []registry.Image

// ListImages lists the images (repository+tag) in a repository
func (c *Client) ListImages(
	ctx context.Context,
	projectID uint,
	registryID uint,
	repoName string,
) (ListImagesResponse, error) {
	req, err := http.NewRequest(
		"GET",
		fmt.Sprintf("%s/projects/%d/registries/%d/repositories/%s", c.BaseURL, projectID, registryID, repoName),
		nil,
	)

	if err != nil {
		return nil, err
	}

	req = req.WithContext(ctx)
	bodyResp := &ListImagesResponse{}

	if httpErr, err := c.sendRequest(req, bodyResp, true); httpErr != nil || err != nil {
		if httpErr != nil {
			return nil, fmt.Errorf("code %d, errors %v", httpErr.Code, httpErr.Errors)
		}

		return nil, err
	}

	return *bodyResp, nil
}
