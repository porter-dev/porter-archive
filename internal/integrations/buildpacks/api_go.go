package buildpacks

import (
	"sync"

	"github.com/google/go-github/github"
)

type apiGoRuntime struct {
	ghClient *github.Client
	wg       sync.WaitGroup
}

func NewAPIGoRuntime(client *github.Client) *apiGoRuntime {
	return &apiGoRuntime{
		ghClient: client,
	}
}

func (runtime *apiGoRuntime) Detect(
	directoryContent []*github.RepositoryContent,
	owner string, name string,
	repoContentOptions github.RepositoryContentGetOptions,
) map[string]interface{} {

	return nil
}
