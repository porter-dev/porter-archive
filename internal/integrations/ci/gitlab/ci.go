package gitlab

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/porter-dev/porter/api/server/shared/commonutils"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/internal/oauth"
	"github.com/porter-dev/porter/internal/repository"
	"github.com/xanzy/go-gitlab"
	"gopkg.in/yaml.v2"
)

type GitlabCI struct {
	ServerURL    string
	GitRepoName  string
	GitRepoOwner string

	Repo repository.Repository

	ProjectID     uint
	ClusterID     uint
	UserID        uint
	IntegrationID uint

	PorterConf       *config.Config
	ReleaseName      string
	ReleaseNamespace string
	FolderPath       string
	PorterToken      string

	defaultGitBranch string
	pID              string
}

func (g *GitlabCI) Setup() error {
	client, err := g.getClient()

	if err != nil {
		return err
	}

	g.pID = fmt.Sprintf("%s/%s", g.GitRepoOwner, g.GitRepoName)

	branches, _, err := client.Branches.ListBranches(g.pID, &gitlab.ListBranchesOptions{})

	if err != nil {
		return fmt.Errorf("error fetching list of branches: %w", err)
	}

	for _, branch := range branches {
		if branch.Default {
			g.defaultGitBranch = branch.Name
			break
		}
	}

	err = g.createGitlabSecret(client)

	if err != nil {
		return err
	}

	jobName := getGitlabStageJobName(g.ReleaseName)

	ciFile, resp, err := client.RepositoryFiles.GetFile(g.pID, ".gitlab-ci.yml", &gitlab.GetFileOptions{
		Ref: gitlab.String(g.defaultGitBranch),
	})

	if resp.StatusCode == http.StatusNotFound {
		// create .gitlab-ci.yml
		contentsMap := make(map[string]interface{})
		contentsMap["stages"] = []string{
			jobName,
		}
		contentsMap[jobName] = g.getCIJob(jobName)

		contentsYAML, _ := yaml.Marshal(contentsMap)

		_, _, err = client.RepositoryFiles.CreateFile(g.pID, ".gitlab-ci.yml", &gitlab.CreateFileOptions{
			Branch:        gitlab.String(g.defaultGitBranch),
			AuthorName:    gitlab.String("Porter Bot"),
			AuthorEmail:   gitlab.String("contact@getporter.dev"),
			Content:       gitlab.String(string(contentsYAML)),
			CommitMessage: gitlab.String("Create .gitlab-ci.yml file"),
		})

		if err != nil {
			return fmt.Errorf("error creating .gitlab-ci.yml file: %w", err)
		}
	} else if err != nil {
		return fmt.Errorf("error getting .gitlab-ci.yml file: %w", err)
	} else {
		// update .gitlab-ci.yml if needed
		ciFileContentsMap := make(map[string]interface{})
		err = yaml.Unmarshal([]byte(ciFile.Content), ciFileContentsMap)

		if err != nil {
			return fmt.Errorf("error unmarshalling existing .gitlab-ci.yml: %w", err)
		}

		stages, ok := ciFileContentsMap["stages"].([]string)

		if !ok {
			return fmt.Errorf("error converting stages to string slice")
		}

		stageExists := false

		for _, stage := range stages {
			if stage == jobName {
				stageExists = true
				break
			}
		}

		if !stageExists {
			stages = append(stages, jobName)

			ciFileContentsMap["stages"] = stages
		}

		ciFileContentsMap[jobName] = g.getCIJob(jobName)

		contentsYAML, _ := yaml.Marshal(ciFileContentsMap)

		_, _, err = client.RepositoryFiles.UpdateFile(g.pID, ".gitlab-ci.yml", &gitlab.UpdateFileOptions{
			Branch:        gitlab.String(g.defaultGitBranch),
			AuthorName:    gitlab.String("Porter Bot"),
			AuthorEmail:   gitlab.String("contact@getporter.dev"),
			Content:       gitlab.String(string(contentsYAML)),
			CommitMessage: gitlab.String("Update .gitlab-ci.yml file"),
		})

		if err != nil {
			return fmt.Errorf("error updating .gitlab-ci.yml file to add porter job: %w", err)
		}
	}

	return nil
}

func (g *GitlabCI) Cleanup() error {
	client, err := g.getClient()

	if err != nil {
		return err
	}

	g.pID = fmt.Sprintf("%s/%s", g.GitRepoOwner, g.GitRepoName)

	branches, _, err := client.Branches.ListBranches(g.pID, &gitlab.ListBranchesOptions{})

	if err != nil {
		return fmt.Errorf("error fetching list of branches: %w", err)
	}

	for _, branch := range branches {
		if branch.Default {
			g.defaultGitBranch = branch.Name
			break
		}
	}

	err = g.deleteGitlabSecret(client)

	if err != nil {
		return err
	}

	jobName := getGitlabStageJobName(g.ReleaseName)

	ciFile, resp, err := client.RepositoryFiles.GetFile(g.pID, ".gitlab-ci.yml", &gitlab.GetFileOptions{
		Ref: gitlab.String(g.defaultGitBranch),
	})

	if resp.StatusCode == http.StatusNotFound {
		return nil
	} else if err != nil {
		return fmt.Errorf("error getting .gitlab-ci.yml file: %w", err)
	}

	ciFileContentsMap := make(map[string]interface{})
	err = yaml.Unmarshal([]byte(ciFile.Content), ciFileContentsMap)

	if err != nil {
		return fmt.Errorf("error unmarshalling existing .gitlab-ci.yml: %w", err)
	}

	stages, ok := ciFileContentsMap["stages"].([]string)

	if !ok {
		return fmt.Errorf("error converting stages to string slice")
	}

	var newStages []string

	for _, stage := range stages {
		if stage != jobName {
			newStages = append(newStages, stage)
		}
	}

	ciFileContentsMap["stage"] = newStages

	delete(ciFileContentsMap, jobName)

	contentsYAML, _ := yaml.Marshal(ciFileContentsMap)

	_, _, err = client.RepositoryFiles.UpdateFile(g.pID, ".gitlab-ci.yml", &gitlab.UpdateFileOptions{
		Branch:        gitlab.String(g.defaultGitBranch),
		AuthorName:    gitlab.String("Porter Bot"),
		AuthorEmail:   gitlab.String("contact@getporter.dev"),
		Content:       gitlab.String(string(contentsYAML)),
		CommitMessage: gitlab.String("Update .gitlab-ci.yml file"),
	})

	if err != nil {
		return fmt.Errorf("error updating .gitlab-ci.yml file to remove porter job: %w", err)
	}

	return nil
}

func (g *GitlabCI) getClient() (*gitlab.Client, error) {
	gi, err := g.Repo.GitlabIntegration().ReadGitlabIntegration(g.ProjectID, g.IntegrationID)

	if err != nil {
		return nil, err
	}

	oauthInt, err := g.Repo.GitlabAppOAuthIntegration().ReadGitlabAppOAuthIntegration(g.UserID, g.ProjectID, g.IntegrationID)

	if err != nil {
		return nil, err
	}

	accessToken, _, err := oauth.GetAccessToken(oauthInt.SharedOAuthModel, commonutils.GetGitlabOAuthConf(g.PorterConf, gi),
		oauth.MakeUpdateGitlabAppOAuthIntegrationFunction(oauthInt, g.Repo))

	if err != nil {
		return nil, err
	}

	client, err := gitlab.NewOAuthClient(accessToken, gitlab.WithBaseURL(gi.InstanceURL))

	if err != nil {
		return nil, err
	}

	return client, nil
}

func (g *GitlabCI) getCIJob(jobName string) map[string]interface{} {
	return map[string]interface{}{
		"image":   "public.ecr.aws/o1j4x7p4/porter-cli:latest",
		"stage":   jobName,
		"timeout": "20 minutes",
		"variables": map[string]string{
			"GIT_STRATEGY": "clone",
		},
		"script": []string{
			fmt.Sprintf("export PORTER_HOST=\"%s\"", g.ServerURL),
			fmt.Sprintf("export PORTER_PROJECT=\"%d\"", g.ProjectID),
			fmt.Sprintf("export PORTER_CLUSTER=\"%d\"", g.ClusterID),
			fmt.Sprintf("export PORTER_TOKEN=\"$%s\"", g.getPorterTokenSecretName()),
			"export PORTER_TAG=\"$(echo $CI_COMMIT_SHA | cut -c1-7)\"",
			fmt.Sprintf("porter update --app \"%s\" --tag \"$PORTER_TAG\" --namespace \"%s\" --path \"%s\" --stream",
				g.ReleaseName, g.ReleaseNamespace, g.FolderPath),
		},
	}
}

func (g *GitlabCI) createGitlabSecret(client *gitlab.Client) error {
	_, _, err := client.ProjectVariables.CreateVariable(g.pID, &gitlab.CreateProjectVariableOptions{
		Key:    gitlab.String(g.getPorterTokenSecretName()),
		Value:  gitlab.String(g.PorterToken),
		Masked: gitlab.Bool(true),
	})

	if err != nil {
		return fmt.Errorf("error creating porter token variable: %w", err)
	}

	return nil
}

func (g *GitlabCI) deleteGitlabSecret(client *gitlab.Client) error {
	_, err := client.ProjectVariables.RemoveVariable(g.pID, g.getPorterTokenSecretName(), &gitlab.RemoveProjectVariableOptions{})

	if err != nil {
		return fmt.Errorf("error removing porter token variable: %w", err)
	}

	return nil
}

func (g *GitlabCI) getPorterTokenSecretName() string {
	return fmt.Sprintf("PORTER_TOKEN_%d", g.ProjectID)
}

func getGitlabStageJobName(releaseName string) string {
	return fmt.Sprintf("porter-%s", strings.ToLower(strings.ReplaceAll(releaseName, "_", "-")))
}
