package connect

// import (
// 	"context"
// 	"fmt"
// 	"strconv"
// 	"time"

// 	"github.com/porter-dev/porter/cli/cmd/api"
// 	"github.com/porter-dev/porter/cli/cmd/utils"

// 	ints "github.com/porter-dev/porter/internal/models/integrations"
// )

// // Actions creates a github actions integration
// func Actions(
// 	client *api.Client,
// 	projectID uint,
// ) error {
// 	// if project ID is 0, ask the user to set the project ID or create a project
// 	if projectID == 0 {
// 		return fmt.Errorf("no project set, please run porter project set [id]")
// 	}

// 	// list oauth integrations and make sure Github exists
// 	oauthInts, err := client.ListOAuthIntegrations(context.TODO(), projectID)

// 	if err != nil {
// 		return err
// 	}

// 	linkedGH := false

// 	// iterate through oauth integrations to find do
// 	for _, oauthInt := range oauthInts {
// 		if oauthInt.Client == ints.OAuthGithub {
// 			linkedGH = true
// 			break
// 		}
// 	}

// 	if !linkedGH {
// 		_, err = triggerGithubOAuth(client, projectID)

// 		if err != nil {
// 			return err
// 		}
// 	}

// 	gitRepos, err := client.ListGitRepos(context.TODO(), projectID)

// 	gitRepoID := gitRepos[0].ID

// 	// prompts (unfortunately a lot)
// 	clusterIDStr, _ := utils.PromptPlaintext(fmt.Sprintf(`Please provide the cluster id (can be found with "porter clusters list").
// Cluster ID: `))
// 	clusterID, err := strconv.ParseUint(clusterIDStr, 10, 64)

// 	if err != nil {
// 		return err
// 	}

// 	releaseName, _ := utils.PromptPlaintext(fmt.Sprintf(`Release name:`))
// 	releaseNamespace, _ := utils.PromptPlaintext(fmt.Sprintf(`Release namespace:`))
// 	gitRepo, _ := utils.PromptPlaintext(fmt.Sprintf(`Please enter the Github repo, in the form ${owner}/${repo_name}. For example, porter-dev/porter.
// Github repo:`))

// 	imageRepo, _ := utils.PromptPlaintext(fmt.Sprintf(`Please enter the image repo url.
// Image repo:`))

// 	dockerfilePath, _ := utils.PromptPlaintext(fmt.Sprintf(`Please enter the path in the repo to your dockerfile.
// Dockerfile path:`))

// 	err = client.CreateGithubAction(
// 		context.Background(),
// 		projectID,
// 		uint(clusterID),
// 		releaseName,
// 		releaseNamespace,
// 		&api.CreateGithubActionRequest{
// 			GitRepo:        gitRepo,
// 			ImageRepoURI:   imageRepo,
// 			DockerfilePath: dockerfilePath,
// 			GitRepoID:      gitRepoID,
// 		},
// 	)

// 	return err
// }

// func triggerGithubOAuth(client *api.Client, projectID uint) (ints.OAuthIntegrationExternal, error) {
// 	var ghAuth ints.OAuthIntegrationExternal

// 	oauthURL := fmt.Sprintf("%s/oauth/projects/%d/github", client.BaseURL, projectID)

// 	fmt.Printf("Please visit %s in your browser to connect to Github (it should open automatically).", oauthURL)
// 	utils.OpenBrowser(oauthURL)

// 	for {
// 		oauthInts, err := client.ListOAuthIntegrations(context.TODO(), projectID)

// 		if err != nil {
// 			return ghAuth, err
// 		}

// 		linkedGH := false

// 		// iterate through oauth integrations to find do
// 		for _, oauthInt := range oauthInts {
// 			if oauthInt.Client == ints.OAuthGithub {
// 				linkedGH = true
// 				ghAuth = oauthInt
// 				break
// 			}
// 		}

// 		if linkedGH {
// 			break
// 		}

// 		time.Sleep(2 * time.Second)
// 	}

// 	return ghAuth, nil
// }
