package buildpacks

import (
	"context"
	"fmt"
	"os"
	"strings"
	"sync"

	"github.com/google/go-github/github"
	"github.com/pelletier/go-toml"
)

type pythonRuntime struct {
	wg    sync.WaitGroup
	packs map[string]*BuildpackInfo
}

// FIXME: should be called once at the top-level somewhere in the backend
func populatePythonPacks(client *github.Client) map[string]*BuildpackInfo {
	packs := make(map[string]*BuildpackInfo)

	repoRelease, _, err := client.Repositories.GetLatestRelease(context.Background(), "paketo-buildpacks", "python")
	if err != nil {
		fmt.Printf("Error fetching latest release for paketo-buildpacks/python: %v\n", err)
		return nil
	}
	fileContent, _, _, err := client.Repositories.GetContents(
		context.Background(), "paketo-buildpacks", "python", "buildpack.toml",
		&github.RepositoryContentGetOptions{
			Ref: *repoRelease.TagName,
		},
	)
	if err != nil {
		fmt.Printf("Error fetching contents of buildpack.toml for paketo-buildpacks/python: %v\n", err)
		return nil
	}

	data, err := fileContent.GetContent()
	if err != nil {
		fmt.Printf("Error calling GetContent() on buildpack.toml for paketo-buildpacks/python: %v\n", err)
		return nil
	}

	buildpackToml, err := toml.Load(data)
	if err != nil {
		fmt.Printf("Error while reading buildpack.toml from paketo-buildpacks/python: %v\n", err)
		os.Exit(1)
	}
	order := buildpackToml.Get("order").([]*toml.Tree)

	// pipenv
	packs[pipenv] = newBuildpackInfo()
	pipenvGroup := order[0].GetArray("group").([]*toml.Tree)
	for i := 0; i < len(pipenvGroup); i++ {
		packs[pipenv].addPack(
			buildpackOrderGroupInfo{
				ID:       pipenvGroup[i].Get("id").(string),
				Optional: pipenvGroup[i].GetDefault("optional", false).(bool),
				Version:  pipenvGroup[i].Get("version").(string),
			},
		)
	}

	// pip
	packs[pip] = newBuildpackInfo()
	pipGroup := order[1].GetArray("group").([]*toml.Tree)
	for i := 0; i < len(pipGroup); i++ {
		packs[pip].addPack(
			buildpackOrderGroupInfo{
				ID:       pipGroup[i].Get("id").(string),
				Optional: pipGroup[i].GetDefault("optional", false).(bool),
				Version:  pipGroup[i].Get("version").(string),
			},
		)
	}

	// conda
	packs[conda] = newBuildpackInfo()
	condaGroup := order[2].GetArray("group").([]*toml.Tree)
	for i := 0; i < len(condaGroup); i++ {
		packs[pip].addPack(
			buildpackOrderGroupInfo{
				ID:       condaGroup[i].Get("id").(string),
				Optional: condaGroup[i].GetDefault("optional", false).(bool),
				Version:  condaGroup[i].Get("version").(string),
			},
		)
	}

	// no package manager
	packs[standalone] = newBuildpackInfo()
	standaloneGroup := order[3].GetArray("group").([]*toml.Tree)
	for i := 0; i < len(standaloneGroup); i++ {
		packs[standalone].addPack(
			buildpackOrderGroupInfo{
				ID:       standaloneGroup[i].Get("id").(string),
				Optional: standaloneGroup[i].GetDefault("optional", false).(bool),
				Version:  standaloneGroup[i].Get("version").(string),
			},
		)
	}

	return packs
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
	} else {
		results <- struct {
			string
			bool
		}{pipenv, false}
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
	} else {
		results <- struct {
			string
			bool
		}{pip, false}
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
	} else {
		results <- struct {
			string
			bool
		}{conda, false}
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
	} else {
		results <- struct {
			string
			bool
		}{standalone, false}
	}
	runtime.wg.Done()
}

func (runtime *pythonRuntime) Detect(
	client *github.Client,
	directoryContent []*github.RepositoryContent,
	owner, name, path string,
	repoContentOptions github.RepositoryContentGetOptions,
) *RuntimeResponse {
	runtime.packs = populatePythonPacks(client)

	results := make(chan struct {
		string
		bool
	}, 4)

	fmt.Printf("Starting detection for a Python runtime for %s/%s\n", owner, name)
	runtime.wg.Add(4)
	fmt.Println("Checking for pipenv")
	go runtime.detectPipenv(results, directoryContent)
	fmt.Println("Checking for pip")
	go runtime.detectPip(results, directoryContent)
	fmt.Println("Checking for conda")
	go runtime.detectConda(results, directoryContent)
	fmt.Println("Checking for Python standalone")
	go runtime.detectStandalone(results, directoryContent)
	runtime.wg.Wait()
	close(results)

	detected := make(map[string]bool)
	for result := range results {
		detected[result.string] = result.bool
	}

	// TODO: how to access config values for Python projects
	if detected[pipenv] {
		fmt.Printf("Python pipenv runtime detected for %s/%s\n", owner, name)
		return &RuntimeResponse{
			Name:       "Python",
			Runtime:    pipenv,
			Buildpacks: runtime.packs[pipenv],
		}
	} else if detected[pip] {
		fmt.Printf("Python pip runtime detected for %s/%s\n", owner, name)
		return &RuntimeResponse{
			Name:       "Python",
			Runtime:    pip,
			Buildpacks: runtime.packs[pip],
		}
	} else if detected[conda] {
		fmt.Printf("Python conda runtime detected for %s/%s\n", owner, name)
		return &RuntimeResponse{
			Name:       "Python",
			Runtime:    conda,
			Buildpacks: runtime.packs[conda],
		}
	} else if detected[standalone] {
		fmt.Printf("Python standalone runtime detected for %s/%s\n", owner, name)
		return &RuntimeResponse{
			Name:       "Python",
			Runtime:    standalone,
			Buildpacks: runtime.packs[standalone],
		}
	}

	fmt.Printf("No Python runtime detected for %s/%s\n", owner, name)
	return nil
}
