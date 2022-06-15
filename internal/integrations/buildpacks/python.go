package buildpacks

import (
	"strings"
	"sync"

	"github.com/google/go-github/v41/github"
	"github.com/xanzy/go-gitlab"
)

type pythonRuntime struct {
	wg sync.WaitGroup
}

func NewPythonRuntime() Runtime {
	return &pythonRuntime{}
}

func (runtime *pythonRuntime) detectPipenvGithub(results chan struct {
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

func (runtime *pythonRuntime) detectPipenvGitlab(results chan struct {
	string
	bool
}, tree []*gitlab.TreeNode) {
	pipfileFound := false
	pipfileLockFound := false
	for i := 0; i < len(tree); i++ {
		name := tree[i].Name
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

func (runtime *pythonRuntime) detectPipGithub(results chan struct {
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

func (runtime *pythonRuntime) detectPipGitlab(results chan struct {
	string
	bool
}, tree []*gitlab.TreeNode) {
	requirementsTxtFound := false
	for i := 0; i < len(tree); i++ {
		name := tree[i].Name
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

func (runtime *pythonRuntime) detectCondaGithub(results chan struct {
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

func (runtime *pythonRuntime) detectCondaGitlab(results chan struct {
	string
	bool
}, tree []*gitlab.TreeNode) {
	environmentFound := false
	packageListFound := false
	for i := 0; i < len(tree); i++ {
		name := tree[i].Name
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

func (runtime *pythonRuntime) detectStandaloneGithub(results chan struct {
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

func (runtime *pythonRuntime) detectStandaloneGitlab(results chan struct {
	string
	bool
}, tree []*gitlab.TreeNode) {
	pyFound := false
	for i := 0; i < len(tree); i++ {
		name := tree[i].Name
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

func (runtime *pythonRuntime) DetectGithub(
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
	go runtime.detectPipenvGithub(results, directoryContent)
	go runtime.detectPipGithub(results, directoryContent)
	go runtime.detectCondaGithub(results, directoryContent)
	go runtime.detectStandaloneGithub(results, directoryContent)
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

func (runtime *pythonRuntime) DetectGitlab(
	client *gitlab.Client,
	tree []*gitlab.TreeNode,
	owner, name, path, ref string,
	paketo, heroku *BuilderInfo,
) error {
	results := make(chan struct {
		string
		bool
	}, 4)

	runtime.wg.Add(4)
	go runtime.detectPipenvGitlab(results, tree)
	go runtime.detectPipGitlab(results, tree)
	go runtime.detectCondaGitlab(results, tree)
	go runtime.detectStandaloneGitlab(results, tree)
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
