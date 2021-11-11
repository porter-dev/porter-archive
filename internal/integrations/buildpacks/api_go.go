package buildpacks

import (
	"fmt"
	"sync"

	"github.com/google/go-github/github"
)

type apiGoRuntime struct {
	wg sync.WaitGroup
}

func NewAPIGoRuntime() APIRuntime {
	return &apiGoRuntime{}
}

func (runtime *apiGoRuntime) detectMod(results chan struct {
	string
	bool
}, directoryContent []*github.RepositoryContent) {
	goModFound := false
	for i := 0; i < len(directoryContent); i++ {
		name := directoryContent[i].GetName()
		if name == "go.mod" {
			goModFound = true
		}
	}
	if goModFound {
		results <- struct {
			string
			bool
		}{mod, true}
	} else {
		results <- struct {
			string
			bool
		}{mod, false}
	}
}

func (runtime *apiGoRuntime) detectDep(results chan struct {
	string
	bool
}, directoryContent []*github.RepositoryContent) {
	gopkgFound := false
	vendorFound := false
	for i := 0; i < len(directoryContent); i++ {
		name := directoryContent[i].GetName()
		if name == "Gopkg.toml" {
			gopkgFound = true
		} else if name == "vendor" && directoryContent[i].GetType() == "dir" {
			vendorFound = true
		}
		if gopkgFound && vendorFound {
			break
		}
	}
	if gopkgFound && vendorFound {
		results <- struct {
			string
			bool
		}{dep, true}
	} else {
		results <- struct {
			string
			bool
		}{dep, false}
	}
}

func (runtime *apiGoRuntime) Detect(
	client *github.Client,
	directoryContent []*github.RepositoryContent,
	owner, name, path string,
	repoContentOptions github.RepositoryContentGetOptions,
) *RuntimeResponse {
	results := make(chan struct {
		string
		bool
	}, 2)

	fmt.Printf("Starting detection for a Go runtime for %s/%s\n", owner, name)
	runtime.wg.Add(2)
	fmt.Println("Checking for go-mod")
	go runtime.detectMod(results, directoryContent)
	fmt.Println("Checking for dep")
	go runtime.detectDep(results, directoryContent)
	runtime.wg.Wait()
	close(results)

	atLeastOne := false
	detected := make(map[string]bool)
	for result := range results {
		if result.bool {
			atLeastOne = true
		}
		detected[result.string] = result.bool
	}

	if atLeastOne {
		// TODO: how to access config values for Go projects
		if detected[mod] {
			return &RuntimeResponse{
				Name:    "Go",
				Runtime: mod,
			}
		} else if detected[dep] {
			return &RuntimeResponse{
				Name:    "Go",
				Runtime: dep,
			}
		}
	}

	return nil
}
