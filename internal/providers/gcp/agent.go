package gcp

import (
	"context"

	admin "cloud.google.com/go/iam/admin/apiv1"
	adminpb "google.golang.org/genproto/googleapis/iam/admin/v1"

	crm "google.golang.org/api/cloudresourcemanager/v1"
)

type Agent struct {
	Ctx       context.Context
	ProjectID string

	IAMClient                   *admin.IamClient
	CloudResourceManagerService *crm.Service
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
