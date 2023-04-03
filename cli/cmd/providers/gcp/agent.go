package gcp

import (
	"context"
	"fmt"
	"net/url"

	admin "cloud.google.com/go/iam/admin/apiv1"
	adminpb "google.golang.org/genproto/googleapis/iam/admin/v1"

	crm "google.golang.org/api/cloudresourcemanager/v1"
	gke "google.golang.org/api/container/v1"
)

type Agent struct {
	Ctx       context.Context
	ProjectID string

	IAMClient                   *admin.IamClient
	CloudResourceManagerService *crm.Service
	GKEService                  *gke.Service
}

func (a *Agent) CreateServiceAccount(name string) (*adminpb.ServiceAccount, error) {
	req := &adminpb.CreateServiceAccountRequest{
		Name:      "projects/" + a.ProjectID,
		AccountId: name,
		ServiceAccount: &adminpb.ServiceAccount{
			DisplayName: name,
		},
	}

	return a.IAMClient.CreateServiceAccount(a.Ctx, req)
}

func (a *Agent) SetServiceAccountIAMPolicy(sa *adminpb.ServiceAccount) error {
	projectSvc := a.CloudResourceManagerService.Projects

	policy, err := projectSvc.GetIamPolicy(
		a.ProjectID,
		&crm.GetIamPolicyRequest{},
	).Do()
	if err != nil {
		return err
	}

	doesExist := false

	// find a container.developer binding if it exists
	for _, binding := range policy.Bindings {
		if binding.Role == "roles/container.developer" {
			doesExist = true
			binding.Members = append(binding.Members, "serviceAccount:"+sa.Email)
			break
		}
	}

	if !doesExist {
		policy.Bindings = append(policy.Bindings, &crm.Binding{
			Members: []string{"serviceAccount:" + sa.Email},
			Role:    "roles/container.developer",
		})
	}

	policy, err = projectSvc.SetIamPolicy(
		a.ProjectID,
		&crm.SetIamPolicyRequest{
			Policy: policy,
		},
	).Do()

	if err != nil {
		return err
	}

	return nil
}

type ServiceAccountKey struct {
	// set to service_account
	Type         string `json:"type"`
	ProjectID    string `json:"project_id"`
	PrivateKeyID string `json:"private_key_id"`
	// the private key, not base64 encoded
	PrivateKey              string `json:"private_key"`
	ClientEmail             string `json:"client_email"`
	ClientID                string `json:"client_id"`
	AuthURI                 string `json:"auth_uri"`
	TokenURI                string `json:"token_uri"`
	AuthProviderX509CertURL string `json:"auth_provider_x509_cert_url"`
	ClientX509CertURL       string `json:"client_x509_cert_url"`
}

// CreateServiceAccountKey will create a new key for the specified service account
func (a *Agent) CreateServiceAccountKey(sa *adminpb.ServiceAccount) ([]byte, error) {
	req := &adminpb.CreateServiceAccountKeyRequest{
		Name: "projects/" + a.ProjectID + "/serviceAccounts/" + sa.Email,
	}

	resp, err := a.IAMClient.CreateServiceAccountKey(a.Ctx, req)
	if err != nil {
		return nil, err
	}

	return resp.GetPrivateKeyData(), nil
}

// GetProjectIDForGKECluster automatically determines the project ID for a cluster
// that a user has access to
func (a *Agent) GetProjectIDForGKECluster(endpoint string) (string, error) {
	// get a list of project IDs
	projectSvc := a.CloudResourceManagerService.Projects

	resp, err := projectSvc.List().Do()
	if err != nil {
		return "", err
	}

	projectIDs := make([]string, 0)

	for _, project := range resp.Projects {
		projectIDs = append(projectIDs, project.ProjectId)
	}

	// parse endpoint for ip address
	u, err := url.Parse(endpoint)
	if err != nil {
		return "", err
	}

	ipAddr := u.Hostname()

	// iterate through the projects, and get the GKE endpoints for each project
	// if there's a match, return that project id
	for _, projectID := range projectIDs {
		projectsLocsService := a.GKEService.Projects.Locations

		// this should be all zones
		resp, err := projectsLocsService.Clusters.List("projects/" + projectID + "/locations/-").Do()
		// we'll just continue -- if nothing is found, we'll return an error
		if err != nil {
			continue
		}

		for _, cluster := range resp.Clusters {
			if cluster.Endpoint == ipAddr {
				return projectID, nil
			}
		}
	}

	return "", fmt.Errorf("cluster not found")
}
