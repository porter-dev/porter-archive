package actions

import (
	"context"
	"encoding/base64"
	"fmt"
	"net/http"

	"github.com/bradleyfalzon/ghinstallation"
	"github.com/google/go-github/v33/github"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/oauth"
	"github.com/porter-dev/porter/internal/repository"
	"golang.org/x/crypto/nacl/box"
	"golang.org/x/oauth2"

	"strings"

	"gopkg.in/yaml.v2"
)

type GithubActions struct {
	ServerURL string

	GithubOAuthIntegration *models.GitRepo
	GitRepoName            string
	GitRepoOwner           string
	Repo                   repository.Repository

	GithubConf           *oauth2.Config // one of these will let us authenticate
	GithubAppID          int64
	GithubAppSecretPath  string
	GithubInstallationID uint

	PorterToken string
	BuildEnv    map[string]string
	ProjectID   uint
	ClusterID   uint
	ReleaseName string

	GitBranch      string
	DockerFilePath string
	FolderPath     string
	ImageRepoURL   string

	defaultBranch string
	Version       string
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

	// create porter token secret
	if err := g.createGithubSecret(client, g.getPorterTokenSecretName(), g.PorterToken); err != nil {
		return "", err
	}

	fileBytes, err := g.GetGithubActionYAML()

	if err != nil {
		return "", err
	}

	return g.commitGithubFile(client, g.getPorterYMLFileName(), fileBytes)
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

	// delete the webhook token secret
	err = g.deleteGithubSecret(client, g.getWebhookSecretName())

	if err != nil {
		return err
	}

	// delete the env secret
	err = g.deleteGithubSecret(client, g.getBuildEnvSecretName())

	if err != nil {
		return err
	}

	return g.deleteGithubFile(client, g.getPorterYMLFileName())
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
		getUpdateAppStep(g.ServerURL, g.getPorterTokenSecretName(), g.ProjectID, g.ClusterID, g.ReleaseName, g.Version),
	}

	branch := g.GitBranch

	if branch == "" {
		branch = g.defaultBranch
	}

	actionYAML := &GithubActionYAML{
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
		oauthInt, err := g.Repo.OAuthIntegration.ReadOAuthIntegration(g.GithubOAuthIntegration.OAuthIntegrationID)

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
	sha := ""

	branch := g.GitBranch

	if branch == "" {
		branch = g.defaultBranch
	}

	// get contents of a file if it exists
	fileData, _, _, _ := client.Repositories.GetContents(
		context.TODO(),
		g.GitRepoOwner,
		g.GitRepoName,
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

	if g.GithubOAuthIntegration != nil {
		opts.Committer = &github.CommitAuthor{
			Name:  github.String("Porter Bot"),
			Email: github.String("contact@getporter.dev"),
		}
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

func (g *GithubActions) deleteGithubFile(
	client *github.Client,
	filename string,
) error {
	filepath := ".github/workflows/" + filename
	sha := ""

	// get contents of a file if it exists
	fileData, _, _, _ := client.Repositories.GetContents(
		context.TODO(),
		g.GitRepoOwner,
		g.GitRepoName,
		filepath,
		&github.RepositoryContentGetOptions{},
	)

	if fileData != nil {
		sha = *fileData.SHA
	}

	opts := &github.RepositoryContentFileOptions{
		Message: github.String(fmt.Sprintf("Delete %s file", filename)),
		Branch:  github.String(g.defaultBranch),
		SHA:     &sha,
	}

	if g.GithubOAuthIntegration != nil {
		opts.Committer = &github.CommitAuthor{
			Name:  github.String("Porter Bot"),
			Email: github.String("contact@getporter.dev"),
		}
	}

	_, _, err := client.Repositories.DeleteFile(
		context.TODO(),
		g.GitRepoOwner,
		g.GitRepoName,
		filepath,
		opts,
	)

	if err != nil {
		return err
	}

	return nil
}
