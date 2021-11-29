package buildpacks

import (
	"strings"
	"sync"

	"github.com/google/go-github/github"
)

type pythonRuntime struct {
	wg sync.WaitGroup
}

func NewPythonRuntime() Runtime {
	return &pythonRuntime{}
}

func (runtime *pythonRuntime) detectPipenv(results chan struct {
	string
	bool
}, directoryContent []*github.RepositoryContent) {
	pipfileFound := false
	pipfileLockFound := false
	for i := 0; i < len(directoryContent); i++ {
		name := directoryContent[i].GetName()
		if name == "Pipfile" {
			pipfileFound = true
		} else if name == "Pipfile.lock" {
			pipfileLockFound = true
		}
		if pipfileFound && pipfileLockFound {
			break
		}
	}
	if pipfileFound && pipfileLockFound {
		results <- struct {
			string
			bool
		}{pipenv, true}
	}
	runtime.wg.Done()
}

func (runtime *pythonRuntime) detectPip(results chan struct {
	string
	bool
}, directoryContent []*github.RepositoryContent) {
	requirementsTxtFound := false
	for i := 0; i < len(directoryContent); i++ {
		name := directoryContent[i].GetName()
		if name == "requirements.txt" {
			requirementsTxtFound = true
		}
	}
	if requirementsTxtFound {
		results <- struct {
			string
			bool
		}{pip, true}
	}
	runtime.wg.Done()
}

func (runtime *pythonRuntime) detectConda(results chan struct {
	string
	bool
}, directoryContent []*github.RepositoryContent) {
	environmentFound := false
	packageListFound := false
	for i := 0; i < len(directoryContent); i++ {
		name := directoryContent[i].GetName()
		if name == "environment.yml" {
			environmentFound = true
			break
		} else if name == "package-list.txt" {
			packageListFound = true
			break
		}
	}
	if environmentFound || packageListFound {
		results <- struct {
			string
			bool
		}{conda, true}
	}
	runtime.wg.Done()
}

func (runtime *pythonRuntime) detectStandalone(results chan struct {
	string
	bool
}, directoryContent []*github.RepositoryContent) {
	pyFound := false
	for i := 0; i < len(directoryContent); i++ {
		name := directoryContent[i].GetName()
		if strings.HasSuffix(name, ".py") {
			pyFound = true
			break
		}
	}
	if pyFound {
		results <- struct {
			string
			bool
		}{standalone, true}
	}
	runtime.wg.Done()
}

func (runtime *pythonRuntime) Detect(
	client *github.Client,
	directoryContent []*github.RepositoryContent,
	owner, name, path string,
	repoContentOptions github.RepositoryContentGetOptions,
	paketo, heroku *BuilderInfo,
) error {
	results := make(chan struct {
		string
		bool
	}, 4)

	runtime.wg.Add(4)
	go runtime.detectPipenv(results, directoryContent)
	go runtime.detectPip(results, directoryContent)
	go runtime.detectConda(results, directoryContent)
	go runtime.detectStandalone(results, directoryContent)
	runtime.wg.Wait()
	close(results)

	paketoBuildpackInfo := BuildpackInfo{
		Name:      "Python",
		Buildpack: "gcr.io/paketo-buildpacks/python",
	}
	herokuBuildpackInfo := BuildpackInfo{
		Name:      "Python",
		Buildpack: "heroku/python",
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
