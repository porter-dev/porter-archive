package local

import (
	"context"
	"fmt"
	"os/exec"
	"time"

	"github.com/porter-dev/porter/cli/cmd/providers/gcp"
	"google.golang.org/api/cloudresourcemanager/v1"
	gke "google.golang.org/api/container/v1"

	admin "cloud.google.com/go/iam/admin/apiv1"

	oauth2 "golang.org/x/oauth2/google"
)

// NewDefaultAgent returns an agent using Application Default Credentials. If these are not
// set and the gcloud utility is installed on the machine, this will spawn a setup process
// to link these credentials.
func NewDefaultAgent() (*gcp.Agent, error) {
	ctx := context.Background()
	creds, err := setupDefaultCredentials(ctx)
	if err != nil {
		return nil, err
	}

	c, err := getDefaultIAMClient(ctx)
	if err != nil {
		return nil, err
	}

	cloudresourcemanagerService, err := cloudresourcemanager.NewService(ctx)
	if err != nil {
		return nil, err
	}

	gkeService, err := gke.NewService(ctx)

	return &gcp.Agent{
		Ctx:                         ctx,
		ProjectID:                   creds.ProjectID,
		IAMClient:                   c,
		CloudResourceManagerService: cloudresourcemanagerService,
		GKEService:                  gkeService,
	}, nil
}

func setupDefaultCredentials(ctx context.Context) (*oauth2.Credentials, error) {
	// determine if local Application Default Credentials Exist
	creds, _ := oauth2.FindDefaultCredentials(ctx)

	// if they don't exist, attempt gcloud login
	if creds == nil {
		if !commandExists("gcloud") {
			return nil, fmt.Errorf("gcloud cli command does not exist")
		}

		// create Application Default Credentials that use the local user creds
		cmd := exec.Command("gcloud", "auth", "application-default", "login")
		err := cmd.Run()
		if err != nil {
			return nil, err
		}

		for i := 0; i < 5; i++ {
			creds, err := oauth2.FindDefaultCredentials(ctx)

			if creds != nil {
				return creds, err
			}

			if i == 4 {
				return nil, err
			}

			time.Sleep(time.Second)
		}
	}

	return creds, nil
}

func getDefaultIAMClient(ctx context.Context) (*admin.IamClient, error) {
	return admin.NewIamClient(ctx)
}

func commandExists(cmd string) bool {
	_, err := exec.LookPath(cmd)
	return err == nil
}
