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
	ProjectID    uint
	ReleaseName  string

	DockerFilePath string
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

	fileBytes, err := g.GetGithubActionYAML()

	if err != nil {
		return "", err
	}

	return g.commitGithubFile(client, g.getPorterYMLFileName(), fileBytes)
}

type GithubActionYAMLStep struct {
	Name string `yaml:"name"`
	ID   string `yaml:"id"`
	Uses string `yaml:"uses"`
	Run  string `yaml:"run"`
}

type GithubActionYAMLOnPushBranches struct {
	Branches []string `yaml:"branches"`
}

type GithubActionYAMLOnPush struct {
	Push GithubActionYAMLOnPushBranches `yaml:"push"`
}

type GithubActionYAMLJob struct {
	RunsOn string                 `yaml:"runs-on"`
	Steps  []GithubActionYAMLStep `yaml:"steps"`
}

type GithubActionYAML struct {
	On GithubActionYAMLOnPush `yaml:"on"`

	Name string `yaml:"name"`

	Jobs map[string]GithubActionYAMLJob `yaml:"jobs"`
}

func (g *GithubActions) GetGithubActionYAML() ([]byte, error) {
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
			"porter-deploy": GithubActionYAMLJob{
				RunsOn: "ubuntu-latest",
				Steps: []GithubActionYAMLStep{
					getCheckoutCodeStep(),
					getDownloadPorterStep(),
					getConfigurePorterStep(g.getPorterTokenSecretName()),
					getDockerBuildPushStep(g.DockerFilePath, g.ImageRepoURL),
					deployPorterWebhookStep(g.getWebhookSecretName(), g.ImageRepoURL),
				},
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

func (g *GithubActions) getWebhookSecretName() string {
	return fmt.Sprintf("WEBHOOK_%s", strings.Replace(
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
