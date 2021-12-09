package buildpacks

import (
	"sync"

	"github.com/google/go-github/github"
)

type goRuntime struct {
	wg sync.WaitGroup
}

func NewGoRuntime() Runtime {
	return &goRuntime{}
}

func (runtime *goRuntime) detectMod(results chan struct {
	string
	bool
}, directoryContent []*github.RepositoryContent) {
	goModFound := false
	for i := 0; i < len(directoryContent); i++ {
		name := directoryContent[i].GetName()
		if name == "go.mod" {
			goModFound = true
			break
		}
	}
	if goModFound {
		results <- struct {
			string
			bool
		}{mod, true}
	}
	runtime.wg.Done()
}

func (runtime *goRuntime) detectDep(results chan struct {
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
	}
	runtime.wg.Done()
}

func (runtime *goRuntime) Detect(
	client *github.Client,
	directoryContent []*github.RepositoryContent,
	owner, name, path string,
	repoContentOptions github.RepositoryContentGetOptions,
	paketo, heroku *BuilderInfo,
) error {
	results := make(chan struct {
		string
		bool
	}, 2)

	runtime.wg.Add(2)
	go runtime.detectMod(results, directoryContent)
	go runtime.detectDep(results, directoryContent)
	runtime.wg.Wait()
	close(results)

	paketoBuildpackInfo := BuildpackInfo{
		Name:      "Go",
		Buildpack: "gcr.io/paketo-buildpacks/go",
	}
	herokuBuildpackInfo := BuildpackInfo{
		Name:      "Go",
		Buildpack: "heroku/go",
	}

	if len(results) == 0 {
		paketo.Others = append(paketo.Others, paketoBuildpackInfo)
		heroku.Others = append(heroku.Others, herokuBuildpackInfo)
		return nil
	}

	paketo.Detected = append(paketo.Detected, paketoBuildpackInfo)
	heroku.Detected = append(heroku.Detected, herokuBuildpackInfo)

	return nil
}
