package actions

import (
	"context"
	"encoding/base64"
	"fmt"

	"github.com/google/go-github/v33/github"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"golang.org/x/crypto/nacl/box"
	"golang.org/x/oauth2"

	"strings"

	"gopkg.in/yaml.v2"
)

type GithubActions struct {
	GitIntegration *models.GitRepo
	GitRepoName    string
	GitRepoOwner   string
	Repo           repository.Repository

	GithubConf *oauth2.Config

	WebhookToken string
	PorterToken  string
	BuildEnv     map[string]string
	ProjectID    uint
	ReleaseName  string

	DockerFilePath string
	FolderPath     string
	ImageRepoURL   string

	defaultBranch string
}

func (g *GithubActions) Setup() (string, error) {
	client, err := g.getClient()

	if err != nil {
		return "", err
	}

	// get the repository to find the default branch
	repo, _, err := client.Repositories.Get(
		context.TODO(),
		g.GitRepoOwner,
		g.GitRepoName,
	)

	if err != nil {
		return "", err
	}

	g.defaultBranch = repo.GetDefaultBranch()

	// create a new secret with a webhook token
	err = g.createGithubSecret(client, g.getWebhookSecretName(), g.WebhookToken)

	if err != nil {
		return "", err
	}

	// create a new secret with a porter token
	err = g.createGithubSecret(client, g.getPorterTokenSecretName(), g.PorterToken)

	if err != nil {
		return "", err
	}

	// create a new secret with the build variables
	err = g.createEnvSecret(client)

	if err != nil {
		return "", err
	}

	fileBytes, err := g.GetGithubActionYAML()

	if err != nil {
		return "", err
	}

	return g.commitGithubFile(client, g.getPorterYMLFileName(), fileBytes)
}

type GithubActionYAMLStep struct {
	Name string `yaml:"name,omitempty"`
	ID   string `yaml:"id,omitempty"`
	Uses string `yaml:"uses,omitempty"`
	Run  string `yaml:"run,omitempty"`
}

type GithubActionYAMLOnPushBranches struct {
	Branches []string `yaml:"branches,omitempty"`
}

type GithubActionYAMLOnPush struct {
	Push GithubActionYAMLOnPushBranches `yaml:"push,omitempty"`
}

type GithubActionYAMLJob struct {
	RunsOn string                 `yaml:"runs-on,omitempty"`
	Steps  []GithubActionYAMLStep `yaml:"steps,omitempty"`
}

type GithubActionYAML struct {
	On GithubActionYAMLOnPush `yaml:"on,omitempty"`

	Name string `yaml:"name,omitempty"`

	Jobs map[string]GithubActionYAMLJob `yaml:"jobs,omitempty"`
}

func (g *GithubActions) GetGithubActionYAML() ([]byte, error) {
	gaSteps := []GithubActionYAMLStep{
		getCheckoutCodeStep(),
		getDownloadPorterStep(),
		getConfigurePorterStep(g.getPorterTokenSecretName()),
	}

	if g.DockerFilePath == "" {
		gaSteps = append(gaSteps, getBuildPackPushStep(g.getBuildEnvSecretName(), g.FolderPath, g.ImageRepoURL))
	} else {
		gaSteps = append(gaSteps, getDockerBuildPushStep(g.getBuildEnvSecretName(), g.DockerFilePath, g.ImageRepoURL))
	}

	gaSteps = append(gaSteps, deployPorterWebhookStep(g.getWebhookSecretName(), g.ImageRepoURL))

	actionYAML := &GithubActionYAML{
		On: GithubActionYAMLOnPush{
			Push: GithubActionYAMLOnPushBranches{
				Branches: []string{
					g.defaultBranch,
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
	// get the oauth integration
	oauthInt, err := g.Repo.OAuthIntegration.ReadOAuthIntegration(g.GitIntegration.OAuthIntegrationID)

	if err != nil {
		return nil, err
	}

	tok := &oauth2.Token{
		AccessToken:  string(oauthInt.AccessToken),
		RefreshToken: string(oauthInt.RefreshToken),
		TokenType:    "Bearer",
	}

	client := github.NewClient(g.GithubConf.Client(oauth2.NoContext, tok))

	return client, nil
}

func (g *GithubActions) createGithubSecret(
	client *github.Client,
	secretName,
	secretValue string,
) error {
	// get the public key for the repo
	key, _, err := client.Actions.GetRepoPublicKey(context.TODO(), g.GitRepoOwner, g.GitRepoName)

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
	_, err = client.Actions.CreateOrUpdateRepoSecret(context.TODO(), g.GitRepoOwner, g.GitRepoName, encryptedSecret)

	return nil
}

func (g *GithubActions) createEnvSecret(client *github.Client) error {
	// convert the env object to a string
	lines := make([]string, 0)

	for key, val := range g.BuildEnv {
		lines = append(lines, fmt.Sprintf(`%s=%s`, key, val))
	}

	secretName := g.getBuildEnvSecretName()

	return g.createGithubSecret(client, secretName, strings.Join(lines, "\n"))
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
	return fmt.Sprintf("porter_%s.yml", strings.Replace(
		strings.ToLower(g.ReleaseName), "-", "_", -1),
	)
}

func (g *GithubActions) getPorterTokenSecretName() string {
	return fmt.Sprintf("PORTER_TOKEN_%d", g.ProjectID)
}

func (g *GithubActions) commitGithubFile(
	client *github.Client,
	filename string,
	contents []byte,
) (string, error) {
	filepath := ".github/workflows/" + filename

	opts := &github.RepositoryContentFileOptions{
		Message: github.String(fmt.Sprintf("Create %s file", filename)),
		Content: contents,
		Branch:  github.String(g.defaultBranch),
		Committer: &github.CommitAuthor{
			Name:  github.String("Porter Bot"),
			Email: github.String("contact@getporter.dev"),
		},
	}

	resp, _, err := client.Repositories.UpdateFile(
		context.TODO(),
		g.GitRepoOwner,
		g.GitRepoName,
		filepath,
		opts,
	)

	if err != nil {
		return "", err
	}

	return *resp.Commit.SHA, nil
}
