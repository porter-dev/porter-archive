package actions

import (
	"context"
	"encoding/base64"
	"errors"
	"fmt"
	"net/http"

	"github.com/Masterminds/semver/v3"
	ghinstallation "github.com/bradleyfalzon/ghinstallation/v2"
	"github.com/google/go-github/v41/github"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/oauth"
	"github.com/porter-dev/porter/internal/repository"
	"golang.org/x/crypto/nacl/box"
	"golang.org/x/oauth2"

	"strings"

	"gopkg.in/yaml.v2"
)

var (
	ErrProtectedBranch            = errors.New("protected branch")
	ErrCreatePRForProtectedBranch = errors.New("unable to create PR to merge workflow files into protected branch")
)

type GithubActions struct {
	ServerURL    string
	InstanceName string

	GithubOAuthIntegration *models.GitRepo
	GitRepoName            string
	GitRepoOwner           string
	Repo                   repository.Repository

	GithubConf           *oauth2.Config // one of these will let us authenticate
	GithubAppID          int64
	GithubAppSecretPath  string
	GithubInstallationID uint

	PorterToken      string
	BuildEnv         map[string]string
	ProjectID        uint
	ClusterID        uint
	ReleaseName      string
	ReleaseNamespace string

	GitBranch      string
	DockerFilePath string
	FolderPath     string
	ImageRepoURL   string

	defaultBranch string
	Version       string

	DryRun               bool
	ShouldCreateWorkflow bool
}

var (
	deleteWebhookAndEnvSecretsConstraint, _ = semver.NewConstraint(" < 0.1.0")
)

func (g *GithubActions) Setup() ([]byte, error) {
	client, err := g.getClient()

	if err != nil {
		return nil, err
	}

	// get the repository to find the default branch
	repo, _, err := client.Repositories.Get(
		context.TODO(),
		g.GitRepoOwner,
		g.GitRepoName,
	)

	if err != nil {
		return nil, err
	}

	g.defaultBranch = repo.GetDefaultBranch()

	if !g.DryRun {
		// create porter token secret
		if err := createGithubSecret(client, g.getPorterTokenSecretName(), g.PorterToken, g.GitRepoOwner, g.GitRepoName); err != nil {
			return nil, err
		}
	}

	workflowYAML, err := g.GetGithubActionYAML()

	if err != nil {
		return nil, err
	}

	if !g.DryRun && g.ShouldCreateWorkflow {
		branch := g.GitBranch

		if branch == "" {
			branch = g.defaultBranch
		}

		// check if the branch is protected
		githubBranch, _, err := client.Repositories.GetBranch(
			context.Background(),
			g.GitRepoOwner,
			g.GitRepoName,
			branch,
			true,
		)

		if err != nil {
			return nil, err
		}

		isOAuth := g.GithubOAuthIntegration != nil

		if githubBranch.GetProtected() {
			err = createNewBranch(client, g.GitRepoOwner, g.GitRepoName, branch, "porter-setup")

			if err != nil {
				return nil, fmt.Errorf(
					"Unable to create PR to merge workflow files into protected branch: %s.\n"+
						"To enable automatic deployments to Porter, please create a Github workflow "+
						"file in this branch with the following contents:\n"+
						"--------\n%s--------\nERROR: %w", branch, string(workflowYAML), ErrCreatePRForProtectedBranch,
				)
			}

			_, err = commitWorkflowFile(client, g.getPorterYMLFileName(), workflowYAML, g.GitRepoOwner,
				g.GitRepoName, "porter-setup", isOAuth)

			if err != nil {
				return nil, fmt.Errorf(
					"Unable to create PR to merge workflow files into protected branch: %s.\n"+
						"To enable automatic deployments to Porter, please create a Github workflow "+
						"file in this branch with the following contents:\n"+
						"--------\n%s--------\nERROR: %w", branch, string(workflowYAML), ErrCreatePRForProtectedBranch,
				)
			}

			pr, _, err := client.PullRequests.Create(
				context.Background(), g.GitRepoOwner, g.GitRepoName, &github.NewPullRequest{
					Title: github.String("Enable Porter automatic deployments"),
					Base:  github.String(branch),
					Head:  github.String("porter-setup"),
				},
			)

			if err != nil {
				return nil, err
			}

			return nil, fmt.Errorf("Please merge %s to enable automatic deployments on Porter.\nERROR: %w",
				pr.GetHTMLURL(), ErrProtectedBranch)
		}

		_, err = commitWorkflowFile(client, g.getPorterYMLFileName(), workflowYAML, g.GitRepoOwner,
			g.GitRepoName, branch, isOAuth)
		if err != nil {
			return workflowYAML, err
		}
	}

	return workflowYAML, err
}

func (g *GithubActions) Cleanup() error {
	client, err := g.getClient()

	if err != nil {
		return err
	}

	// get the repository to find the default branch
	repo, _, err := client.Repositories.Get(
		context.TODO(),
		g.GitRepoOwner,
		g.GitRepoName,
	)

	if err != nil {
		return err
	}

	g.defaultBranch = repo.GetDefaultBranch()

	actionVersion, err := semver.NewVersion(g.Version)
	if err != nil {
		return err
	}

	if deleteWebhookAndEnvSecretsConstraint.Check(actionVersion) {
		// delete the webhook token secret
		if err := g.deleteGithubSecret(client, g.getWebhookSecretName()); err != nil {
			return err
		}

		// delete the env secret
		if err := g.deleteGithubSecret(client, g.getBuildEnvSecretName()); err != nil {
			return err
		}
	}

	branch := g.GitBranch

	if branch == "" {
		branch = g.defaultBranch
	}

	isOAuth := g.GithubOAuthIntegration != nil

	return deleteGithubFile(client, g.getPorterYMLFileName(), g.GitRepoOwner, g.GitRepoName, branch, isOAuth)
}

type GithubActionYAMLStep struct {
	Name    string            `yaml:"name,omitempty"`
	ID      string            `yaml:"id,omitempty"`
	Timeout uint64            `yaml:"timeout-minutes,omitempty"`
	Uses    string            `yaml:"uses,omitempty"`
	Run     string            `yaml:"run,omitempty"`
	With    map[string]string `yaml:"with,omitempty"`
	Env     map[string]string `yaml:"env,omitempty"`
}

type GithubActionYAMLOnPushBranches struct {
	Branches []string `yaml:"branches,omitempty"`
}

type GithubActionYAMLOnPush struct {
	Push GithubActionYAMLOnPushBranches `yaml:"push,omitempty"`
}

type GithubActionYAMLJob struct {
	RunsOn      string                 `yaml:"runs-on,omitempty"`
	Steps       []GithubActionYAMLStep `yaml:"steps,omitempty"`
	Concurrency map[string]string      `yaml:"concurrency,omitempty"`
}

type GithubActionYAML struct {
	On interface{} `yaml:"on,omitempty"`

	Name string `yaml:"name,omitempty"`

	Jobs map[string]GithubActionYAMLJob `yaml:"jobs,omitempty"`
}

func (g *GithubActions) GetGithubActionYAML() ([]byte, error) {
	gaSteps := []GithubActionYAMLStep{
		getCheckoutCodeStep(),
		getSetTagStep(),
		getUpdateAppStep(g.ServerURL, g.getPorterTokenSecretName(), g.ProjectID, g.ClusterID, g.ReleaseName, g.ReleaseNamespace, g.Version),
	}

	branch := g.GitBranch

	if branch == "" {
		branch = g.defaultBranch
	}

	actionYAML := GithubActionYAML{
		On: GithubActionYAMLOnPush{
			Push: GithubActionYAMLOnPushBranches{
				Branches: []string{
					branch,
				},
			},
		},
		Name: "Deploy to Porter",
		Jobs: map[string]GithubActionYAMLJob{
			"porter-deploy": {
				RunsOn: "ubuntu-latest",
				Steps:  gaSteps,
			},
		},
	}

	return yaml.Marshal(actionYAML)
}

func (g *GithubActions) getClient() (*github.Client, error) {

	// in the case that this still uses the oauth integration
	if g.GithubOAuthIntegration != nil {

		// get the oauth integration
		oauthInt, err := g.Repo.OAuthIntegration().ReadOAuthIntegration(g.ProjectID, g.GithubOAuthIntegration.OAuthIntegrationID)

		if err != nil {
			return nil, err
		}

		_, _, err = oauth.GetAccessToken(oauthInt.SharedOAuthModel, g.GithubConf, oauth.MakeUpdateOAuthIntegrationTokenFunction(oauthInt, g.Repo))

		if err != nil {
			return nil, err
		}

		client := github.NewClient(g.GithubConf.Client(oauth2.NoContext, &oauth2.Token{
			AccessToken:  string(oauthInt.AccessToken),
			RefreshToken: string(oauthInt.RefreshToken),
			Expiry:       oauthInt.Expiry,
			TokenType:    "Bearer",
		}))

		return client, nil
	}

	// authenticate as github app installation
	itr, err := ghinstallation.NewKeyFromFile(
		http.DefaultTransport,
		g.GithubAppID,
		int64(g.GithubInstallationID),
		g.GithubAppSecretPath)

	if err != nil {
		return nil, err
	}

	return github.NewClient(&http.Client{Transport: itr}), nil
}

func createGithubSecret(
	client *github.Client,
	secretName,
	secretValue,
	gitRepoOwner,
	gitRepoName string,
) error {
	// get the public key for the repo
	key, _, err := client.Actions.GetRepoPublicKey(context.TODO(), gitRepoOwner, gitRepoName)

	if err != nil {
		return err
	}

	// encrypt the secret with the public key
	keyBytes := [32]byte{}

	keyDecoded, err := base64.StdEncoding.DecodeString(*key.Key)

	if err != nil {
		return err
	}

	copy(keyBytes[:], keyDecoded[:])

	secretEncoded, err := box.SealAnonymous(nil, []byte(secretValue), &keyBytes, nil)

	if err != nil {
		return err
	}

	encrypted := base64.StdEncoding.EncodeToString(secretEncoded)

	encryptedSecret := &github.EncryptedSecret{
		Name:           secretName,
		KeyID:          *key.KeyID,
		EncryptedValue: encrypted,
	}

	// write the secret to the repo
	_, err = client.Actions.CreateOrUpdateRepoSecret(context.TODO(), gitRepoOwner, gitRepoName, encryptedSecret)

	return err
}

func (g *GithubActions) deleteGithubSecret(
	client *github.Client,
	secretName string,
) error {
	// delete the secret from the repo
	_, err := client.Actions.DeleteRepoSecret(
		context.TODO(),
		g.GitRepoOwner,
		g.GitRepoName,
		secretName,
	)

	return err
}

func (g *GithubActions) CreateEnvSecret() error {
	client, err := g.getClient()

	if err != nil {
		return err
	}

	return g.createEnvSecret(client)
}

func (g *GithubActions) createEnvSecret(client *github.Client) error {
	// convert the env object to a string
	lines := make([]string, 0)

	for key, val := range g.BuildEnv {
		lines = append(lines, fmt.Sprintf(`%s=%s`, key, val))
	}

	secretName := g.getBuildEnvSecretName()

	return createGithubSecret(client, secretName, strings.Join(lines, "\n"), g.GitRepoOwner, g.GitRepoName)
}

func (g *GithubActions) getWebhookSecretName() string {
	return fmt.Sprintf("WEBHOOK_%s", strings.Replace(
		strings.ToUpper(g.ReleaseName), "-", "_", -1),
	)
}

func (g *GithubActions) getBuildEnvSecretName() string {
	return fmt.Sprintf("ENV_%s", strings.Replace(
		strings.ToUpper(g.ReleaseName), "-", "_", -1),
	)
}

func (g *GithubActions) getPorterYMLFileName() string {
	if g.InstanceName != "" {
		return fmt.Sprintf("porter_%s_%s.yml", strings.Replace(
			strings.ToLower(g.ReleaseName), "-", "_", -1),
			strings.ToLower(g.InstanceName),
		)
	}

	return fmt.Sprintf("porter_%s.yml", strings.Replace(
		strings.ToLower(g.ReleaseName), "-", "_", -1),
	)
}

func (g *GithubActions) getPorterTokenSecretName() string {
	if g.InstanceName != "" {
		return fmt.Sprintf("PORTER_TOKEN_%s_%d", strings.ToUpper(g.InstanceName), g.ProjectID)
	}

	return fmt.Sprintf("PORTER_TOKEN_%d", g.ProjectID)
}

func getPorterTokenSecretName(projectID uint) string {
	return fmt.Sprintf("PORTER_TOKEN_%d", projectID)
}

func commitWorkflowFile(
	client *github.Client,
	filename string,
	contents []byte,
	gitRepoOwner, gitRepoName, branch string,
	isOAuth bool,
) (string, error) {
	filepath := ".github/workflows/" + filename
	sha := ""

	// get contents of a file if it exists
	fileData, _, _, _ := client.Repositories.GetContents(
		context.TODO(),
		gitRepoOwner,
		gitRepoName,
		filepath,
		&github.RepositoryContentGetOptions{
			Ref: branch,
		},
	)

	if fileData != nil {
		sha = *fileData.SHA
	}

	opts := &github.RepositoryContentFileOptions{
		Message: github.String(fmt.Sprintf("Create %s file", filename)),
		Content: contents,
		Branch:  github.String(branch),
		SHA:     &sha,
	}

	if isOAuth {
		opts.Committer = &github.CommitAuthor{
			Name:  github.String("Porter Bot"),
			Email: github.String("contact@getporter.dev"),
		}
	}

	resp, _, err := client.Repositories.UpdateFile(
		context.TODO(),
		gitRepoOwner,
		gitRepoName,
		filepath,
		opts,
	)

	if err != nil {
		return "", err
	}

	return *resp.Commit.SHA, nil
}

func deleteGithubFile(
	client *github.Client,
	filename, gitRepoOwner, gitRepoName, branch string,
	isOAuth bool,
) error {
	filepath := ".github/workflows/" + filename

	// get contents of a file if it exists
	fileData, _, _, _ := client.Repositories.GetContents(
		context.TODO(),
		gitRepoOwner,
		gitRepoName,
		filepath,
		&github.RepositoryContentGetOptions{
			Ref: branch,
		},
	)

	sha := ""
	if fileData != nil {
		sha = *fileData.SHA
	}

	opts := &github.RepositoryContentFileOptions{
		Message: github.String(fmt.Sprintf("Delete %s file", filename)),
		Branch:  &branch,
		SHA:     &sha,
	}

	if isOAuth {
		opts.Committer = &github.CommitAuthor{
			Name:  github.String("Porter Bot"),
			Email: github.String("contact@getporter.dev"),
		}
	}

	_, response, err := client.Repositories.DeleteFile(
		context.TODO(),
		gitRepoOwner,
		gitRepoName,
		filepath,
		opts,
	)

	if response != nil && response.StatusCode == 404 {
		return nil
	}

	if err != nil {
		return err
	}

	return nil
}
