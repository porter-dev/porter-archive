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
)

type GithubActions struct {
	GitRepo      *models.GitRepo
	GitRepoName  string
	GitRepoOwner string
	Repo         repository.Repository

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
	err = g.createGithubSecret(client, g.getWebhookSecretName(), g.WebhookToken)

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
