package api

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"

	"github.com/porter-dev/porter/internal/models"
)

// GetReleaseLatestRevision gets the latest revision of a Helm release
type GetReleaseWebhookResponse models.ReleaseExternal

func (c *Client) GetReleaseWebhook(
	ctx context.Context,
	projID, clusterID uint,
	name, namespace string,
) (*GetReleaseWebhookResponse, error) {
	req, err := http.NewRequest(
		"GET",
		fmt.Sprintf("%s/projects/%d/releases/%s/webhook_token?"+url.Values{
			"cluster_id": []string{fmt.Sprintf("%d", clusterID)},
			"namespace":  []string{namespace},
			"storage":    []string{"secret"},
		}.Encode(), c.BaseURL, projID, name),
		nil,
	)

	if err != nil {
		return nil, err
	}

	req = req.WithContext(ctx)
	bodyResp := &GetReleaseWebhookResponse{}

	if httpErr, err := c.SendRequest(req, bodyResp, true); httpErr != nil || err != nil {
		if httpErr != nil {
			return nil, fmt.Errorf("code %d, errors %v", httpErr.Code, httpErr.Errors)
		}

		return nil, err
	}

	return bodyResp, nil
}

// DeployWithWebhook deploys an application with an image tag using a unique webhook URI
func (c *Client) DeployWithWebhook(
	ctx context.Context,
	webhook, tag string,
) error {
	req, err := http.NewRequest(
		"POST",
		fmt.Sprintf("%s/webhooks/deploy/%s?commit=%s", c.BaseURL, webhook, tag),
		nil,
	)

	if err != nil {
		return err
	}

	req = req.WithContext(ctx)

	if httpErr, err := c.SendRequest(req, nil, true); httpErr != nil || err != nil {
		if httpErr != nil {
			return fmt.Errorf("code %d, errors %v", httpErr.Code, httpErr.Errors)
		}

		return err
	}

	return nil
}

type UpdateBatchImageRequest struct {
	ImageRepoURI string `json:"image_repo_uri"`
	Tag          string `json:"tag"`
}

// UpdateBatchImage updates all releases that use a certain image with a new tag
func (c *Client) UpdateBatchImage(
	ctx context.Context,
	projID, clusterID uint,
	namespace string,
	updateImageReq *UpdateBatchImageRequest,
) error {
	data, err := json.Marshal(updateImageReq)

	if err != nil {
		return nil
	}

	req, err := http.NewRequest(
		"POST",
		fmt.Sprintf("%s/projects/%d/releases/image/update/batch?"+url.Values{
			"cluster_id": []string{fmt.Sprintf("%d", clusterID)},
			"namespace":  []string{namespace},
			"storage":    []string{"secret"},
		}.Encode(), c.BaseURL, projID),
		strings.NewReader(string(data)),
	)

	if err != nil {
		return err
	}

	req = req.WithContext(ctx)

	if httpErr, err := c.SendRequest(req, nil, true); httpErr != nil || err != nil {
		if httpErr != nil {
			return fmt.Errorf("code %d, errors %v", httpErr.Code, httpErr.Errors)
		}

		return err
	}

	return nil
}

type DeployTemplateGitAction struct {
	GitRepo        string            `json:"git_repo"`
	GitBranch      string            `json:"git_branch"`
	ImageRepoURI   string            `json:"image_repo_uri"`
	DockerfilePath string            `json:"dockerfile_path"`
	FolderPath     string            `json:"folder_path"`
	GitRepoID      uint              `json:"git_repo_id"`
	BuildEnv       map[string]string `json:"env"`
	RegistryID     uint              `json:"registry_id"`
}

type DeployTemplateRequest struct {
	TemplateName string                   `json:"templateName"`
	ImageURL     string                   `json:"imageURL"`
	FormValues   map[string]interface{}   `json:"formValues"`
	Namespace    string                   `json:"namespace"`
	Name         string                   `json:"name"`
	GitAction    *DeployTemplateGitAction `json:"github_action"`
}

func (c *Client) DeployTemplate(
	ctx context.Context,
	projID, clusterID uint,
	templateName string,
	templateVersion string,
	deployReq *DeployTemplateRequest,
) error {
	data, err := json.Marshal(deployReq)

	if err != nil {
		return err
	}

	req, err := http.NewRequest(
		"POST",
		fmt.Sprintf("%s/projects/%d/deploy/%s/%s?"+url.Values{
			"cluster_id": []string{fmt.Sprintf("%d", clusterID)},
			"storage":    []string{"secret"},
		}.Encode(), c.BaseURL, projID, templateName, templateVersion),
		strings.NewReader(string(data)),
	)

	if err != nil {
		return err
	}

	req = req.WithContext(ctx)

	if httpErr, err := c.SendRequest(req, nil, true); httpErr != nil || err != nil {
		if httpErr != nil {
			return fmt.Errorf("code %d, errors %v", httpErr.Code, httpErr.Errors)
		}

		return err
	}

	return nil
}

type UpgradeReleaseRequest struct {
	Values    string `json:"values"`
	Namespace string `json:"namespace"`
}

func (c *Client) UpgradeRelease(
	ctx context.Context,
	projID, clusterID uint,
	name string,
	upgradeReq *UpgradeReleaseRequest,
) error {
	data, err := json.Marshal(upgradeReq)

	if err != nil {
		return err
	}

	req, err := http.NewRequest(
		"POST",
		fmt.Sprintf("%s/projects/%d/releases/%s/upgrade?"+url.Values{
			"namespace":  []string{upgradeReq.Namespace},
			"cluster_id": []string{fmt.Sprintf("%d", clusterID)},
			"storage":    []string{"secret"},
		}.Encode(), c.BaseURL, projID, name),
		strings.NewReader(string(data)),
	)

	if err != nil {
		return err
	}

	req = req.WithContext(ctx)

	if httpErr, err := c.SendRequest(req, nil, true); httpErr != nil || err != nil {
		if httpErr != nil {
			return fmt.Errorf("code %d, errors %v", httpErr.Code, httpErr.Errors)
		}

		return err
	}

	return nil
}
