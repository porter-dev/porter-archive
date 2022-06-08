package gitlab

import (
	"fmt"
	"net/http"
	"net/url"
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
	GitBranch    string

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

	defaultGitBranch  string
	pID               string
	gitlabInstanceURL string
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

	ciFile, resp, err := client.RepositoryFiles.GetRawFile(g.pID, ".gitlab-ci.yml", &gitlab.GetRawFileOptions{
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

		// to preserve the order of the YAML, we use a MapSlice
		ciFileContentsMap := yaml.MapSlice{}
		err = yaml.Unmarshal(ciFile, &ciFileContentsMap)

		if err != nil {
			return fmt.Errorf("error unmarshalling existing .gitlab-ci.yml: %w", err)
		}

		var stagesInt []interface{}
		stagesIdx := -1

		for idx, elem := range ciFileContentsMap {
			if key, ok := elem.Key.(string); ok {
				if key == "stages" {
					stages, ok := elem.Value.([]interface{})

					if !ok {
						return fmt.Errorf("error converting stages to interface slice")
					}

					stagesInt = stages
					stagesIdx = idx

					break
				}
			} else {
				return fmt.Errorf("invalid key '%v' in .gitlab-ci.yml", elem.Key)
			}
		}

		// two cases can happen here:
		// 1: "stages" exists
		// 2: "stages" does not exist

		if stagesIdx >= 0 { // 1: "stages" exists
			stageExists := false

			for _, stage := range stagesInt {
				stageStr, ok := stage.(string)
				if !ok {
					return fmt.Errorf("error converting from interface to string")
				}

				if stageStr == jobName {
					stageExists = true
					break
				}
			}

			if !stageExists {
				stagesInt = append(stagesInt, jobName)

				ciFileContentsMap[stagesIdx] = yaml.MapItem{
					Key:   "stages",
					Value: stagesInt,
				}
			}
		} else { // 2: "stages" does not exist
			stagesInt = append(stagesInt, jobName)

			ciFileContentsMap = append(ciFileContentsMap, yaml.MapItem{
				Key:   "stages",
				Value: stagesInt,
			})
		}

		ciFileContentsMap = append(ciFileContentsMap, yaml.MapItem{
			Key:   jobName,
			Value: g.getCIJob(jobName),
		})

		contentsYAML, err := yaml.Marshal(ciFileContentsMap)

		if err != nil {
			return fmt.Errorf("error marshalling contents of .gitlab-ci.yml while updating to add porter job")
		}

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

	ciFile, resp, err := client.RepositoryFiles.GetRawFile(g.pID, ".gitlab-ci.yml", &gitlab.GetRawFileOptions{
		Ref: gitlab.String(g.defaultGitBranch),
	})

	if resp.StatusCode == http.StatusNotFound {
		return nil
	} else if err != nil {
		return fmt.Errorf("error getting .gitlab-ci.yml file: %w", err)
	}

	ciFileContentsMap := yaml.MapSlice{}
	err = yaml.Unmarshal(ciFile, &ciFileContentsMap)

	if err != nil {
		return fmt.Errorf("error unmarshalling existing .gitlab-ci.yml: %w", err)
	}

	var stagesInt []interface{}
	stagesIdx := -1

	for idx, elem := range ciFileContentsMap {
		if key, ok := elem.Key.(string); ok {
			if key == "stages" {
				stages, ok := elem.Value.([]interface{})

				if !ok {
					return fmt.Errorf("error converting stages to interface slice")
				}

				stagesInt = stages
				stagesIdx = idx

				break
			}
		} else {
			return fmt.Errorf("invalid key '%v' in .gitlab-ci.yml", elem.Key)
		}
	}

	if stagesIdx >= 0 { // "stages" exists
		var newStages []string

		for _, stage := range stagesInt {
			stageStr, ok := stage.(string)
			if !ok {
				return fmt.Errorf("error converting from interface to string")
			}

			if stageStr != jobName {
				newStages = append(newStages, stageStr)
			}
		}

		ciFileContentsMap[stagesIdx] = yaml.MapItem{
			Key:   "stages",
			Value: newStages,
		}
	}

	newCIFileContentsMap := yaml.MapSlice{}

	for _, elem := range ciFileContentsMap {
		if key, ok := elem.Key.(string); ok {
			if key != jobName {
				newCIFileContentsMap = append(newCIFileContentsMap, elem)
			}
		} else {
			return fmt.Errorf("invalid key '%v' in .gitlab-ci.yml", elem.Key)
		}
	}

	contentsYAML, err := yaml.Marshal(newCIFileContentsMap)

	if err != nil {
		return fmt.Errorf("error unmarshalling contents of .gitlab-ci.yml while updating to remove porter job")
	}

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

	giOAuthInt, err := g.Repo.GitlabAppOAuthIntegration().ReadGitlabAppOAuthIntegration(g.UserID, g.ProjectID, g.IntegrationID)

	if err != nil {
		return nil, err
	}

	oauthInt, err := g.Repo.OAuthIntegration().ReadOAuthIntegration(g.ProjectID, giOAuthInt.OAuthIntegrationID)

	if err != nil {
		return nil, err
	}

	accessToken, _, err := oauth.GetAccessToken(
		oauthInt.SharedOAuthModel,
		commonutils.GetGitlabOAuthConf(g.PorterConf, gi),
		oauth.MakeUpdateGitlabAppOAuthIntegrationFunction(g.ProjectID, giOAuthInt, g.Repo),
	)

	if err != nil {
		return nil, err
	}

	client, err := gitlab.NewOAuthClient(accessToken, gitlab.WithBaseURL(gi.InstanceURL))

	if err != nil {
		return nil, err
	}

	g.gitlabInstanceURL = gi.InstanceURL

	return client, nil
}

func (g *GitlabCI) getCIJob(jobName string) yaml.MapSlice {
	res := yaml.MapSlice{}
	url, _ := url.Parse(g.gitlabInstanceURL)

	res = append(res,
		yaml.MapItem{
			Key: "rules",
			Value: []map[string]string{
				{
					"if": fmt.Sprintf("$CI_COMMIT_BRANCH == \"%s\" && $CI_PIPELINE_SOURCE == \"push\"", g.GitBranch),
				},
			},
		},
	)

	if url.Hostname() == "gitlab.com" || url.Hostname() == "www.gitlab.com" {
		res = append(res,
			yaml.MapItem{
				Key:   "image",
				Value: "docker:latest",
			},
			yaml.MapItem{
				Key: "services",
				Value: []string{
					"docker:dind",
				},
			},
			yaml.MapItem{
				Key: "script",
				Value: []string{
					fmt.Sprintf(
						"docker run --rm --workdir=\"/app\" "+
							"-v /var/run/docker.sock:/var/run/docker.sock "+
							"-v $(pwd):/app "+
							"public.ecr.aws/o1j4x7p4/porter-cli:latest "+
							"update --host \"%s\" --project %d --cluster %d "+
							"--token \"$%s\" --app \"%s\" "+
							"--tag \"$(echo $CI_COMMIT_SHA | cut -c1-7)\" --namespace \"%s\" --stream",
						g.ServerURL, g.ProjectID, g.ClusterID, g.getPorterTokenSecretName(),
						g.ReleaseName, g.ReleaseNamespace,
					),
				},
			},
			yaml.MapItem{
				Key: "tags",
				Value: []string{
					"docker",
				},
			},
		)
	} else {
		res = append(res,
			yaml.MapItem{
				Key: "image",
				Value: map[string]interface{}{
					"name": "public.ecr.aws/o1j4x7p4/porter-cli:latest",
					"entrypoint": []string{
						"",
					},
				},
			},
			yaml.MapItem{
				Key: "script",
				Value: []string{
					fmt.Sprintf(
						"porter update --host \"%s\" --project %d --cluster %d "+
							"--token \"$%s\" --app \"%s\" "+
							"--tag \"$(echo $CI_COMMIT_SHA | cut -c1-7)\" --namespace \"%s\" --stream",
						g.ServerURL, g.ProjectID, g.ClusterID, g.getPorterTokenSecretName(),
						g.ReleaseName, g.ReleaseNamespace,
					),
				},
			},
			yaml.MapItem{
				Key: "tags",
				Value: []string{
					"porter-runner",
				},
			},
		)
	}

	res = append(res,
		yaml.MapItem{
			Key:   "stage",
			Value: jobName,
		},
		yaml.MapItem{
			Key:   "timeout",
			Value: "20 minutes",
		},
		yaml.MapItem{
			Key: "variables",
			Value: map[string]string{
				"GIT_STRATEGY": "clone",
			},
		},
	)

	return res
}

func (g *GitlabCI) createGitlabSecret(client *gitlab.Client) error {
	_, resp, err := client.ProjectVariables.GetVariable(g.pID, g.getPorterTokenSecretName(),
		&gitlab.GetProjectVariableOptions{})

	if resp.StatusCode == http.StatusNotFound {
		_, _, err = client.ProjectVariables.CreateVariable(g.pID, &gitlab.CreateProjectVariableOptions{
			Key:    gitlab.String(g.getPorterTokenSecretName()),
			Value:  gitlab.String(g.PorterToken),
			Masked: gitlab.Bool(true),
		})

		if err != nil {
			return fmt.Errorf("error creating porter token variable: %w", err)
		}

		return nil
	} else if err != nil {
		return fmt.Errorf("error getting porter token variable: %w", err)
	}

	_, _, err = client.ProjectVariables.UpdateVariable(g.pID, g.getPorterTokenSecretName(),
		&gitlab.UpdateProjectVariableOptions{
			Value:  gitlab.String(g.PorterToken),
			Masked: gitlab.Bool(true),
		},
	)

	if err != nil {
		return fmt.Errorf("error updating porter token variable: %w", err)
	}

	return nil
}

func (g *GitlabCI) deleteGitlabSecret(client *gitlab.Client) error {
	_, err := client.ProjectVariables.RemoveVariable(g.pID, g.getPorterTokenSecretName(),
		&gitlab.RemoveProjectVariableOptions{})

	if err != nil {
		return fmt.Errorf("error removing porter token variable: %w", err)
	}

	return nil
}

func (g *GitlabCI) getPorterTokenSecretName() string {
	return fmt.Sprintf("PORTER_TOKEN_%d_%s", g.ProjectID, strings.ToLower(strings.ReplaceAll(g.ReleaseName, "-", "_")))
}

func getGitlabStageJobName(releaseName string) string {
	return fmt.Sprintf("porter-%s", strings.ToLower(strings.ReplaceAll(releaseName, "_", "-")))
}
