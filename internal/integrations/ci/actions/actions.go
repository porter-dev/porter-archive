package actions

import (
	"context"

	"github.com/google/go-github/v33/github"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"golang.org/x/crypto/nacl/box"
	"golang.org/x/oauth2"

	"strings"
)

type GithubActions struct {
	GitRepo     *models.GitRepo
	GitRepoName string
	Repo        repository.Repository

	GithubConf *oauth2.Config

	WebhookToken string
	ReleaseName  string
}

func (g *GithubActions) Setup() error {
	client, err := g.getClient()

	if err != nil {
		return err
	}

	// create a new secret with a webhook token
	err = g.createGithubWebhookSecret(client)

	if err != nil {
		return err
	}

	return nil
}

type GithubActionYAML struct {
	On struct {
		Push struct {
			Branches []string `yaml:"branches"`
		} `yaml:"push"`
	} `yaml:"on"`

	Name string `yaml:"name"`

	Jobs map[string]struct {
		RunsOn string `yaml:"runs-on"`
		Steps  []struct {
			Name string `yaml:"name"`
			ID   string `yaml:"id"`
			// TODO -- OTHER RELEVANT STUFF
		} `yaml:"steps"`
	} `yaml:"jobs"`
}

func (g *GithubActions) GetGithubActionYAML() (*github.Client, error) {
	return nil, nil
}

func (g *GithubActions) getClient() (*github.Client, error) {
	// get the oauth integration
	oauthInt, err := g.Repo.OAuthIntegration.ReadOAuthIntegration(g.GitRepo.OAuthIntegrationID)

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

func (g *GithubActions) createGithubWebhookSecret(client *github.Client) error {
	// get the public key for the repo
	key, _, err := client.Actions.GetRepoPublicKey(context.TODO(), "", g.GitRepoName)

	if err != nil {
		return err
	}

	// encrypt the webhook token with the public key
	secretName := g.getSecretName()
	secretValue := []byte(g.WebhookToken)
	out := make([]byte, 0)

	keyBytes := [32]byte{}

	copy(keyBytes[:], *key.Key)

	_, err = box.SealAnonymous(out, secretValue, &keyBytes, nil)

	if err != nil {
		return err
	}

	encryptedSecret := &github.EncryptedSecret{
		Name:           secretName,
		KeyID:          *key.KeyID,
		EncryptedValue: string(out),
	}

	// write the secret to the repo
	_, err = client.Actions.CreateOrUpdateRepoSecret(context.TODO(), "", g.GitRepoName, encryptedSecret)

	return err
}

func (g *GithubActions) getSecretName() string {
	return strings.Replace(strings.ToUpper(g.ReleaseName), "-", "_", -1)
}
