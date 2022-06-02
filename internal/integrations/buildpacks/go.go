package buildpacks

import (
	"sync"

	"github.com/google/go-github/v41/github"
	"github.com/xanzy/go-gitlab"
)

type goRuntime struct {
	wg sync.WaitGroup
}

func NewGoRuntime() Runtime {
	return &goRuntime{}
}

func (runtime *goRuntime) detectModGithub(results chan struct {
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

func (runtime *goRuntime) detectModGitlab(results chan struct {
	string
	bool
}, tree []*gitlab.TreeNode) {
	goModFound := false
	for i := 0; i < len(tree); i++ {
		name := tree[i].Name
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

func (runtime *goRuntime) detectDepGithub(results chan struct {
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

func (runtime *goRuntime) detectDepGitlab(results chan struct {
	string
	bool
}, tree []*gitlab.TreeNode) {
	gopkgFound := false
	vendorFound := false
	for i := 0; i < len(tree); i++ {
		name := tree[i].Name
		if name == "Gopkg.toml" {
			gopkgFound = true
		} else if name == "vendor" && tree[i].Type == "tree" {
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

func (runtime *goRuntime) DetectGithub(
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
	go runtime.detectModGithub(results, directoryContent)
	go runtime.detectDepGithub(results, directoryContent)
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

func (runtime *goRuntime) DetectGitlab(
	client *gitlab.Client,
	tree []*gitlab.TreeNode,
	owner, name, path, ref string,
	paketo, heroku *BuilderInfo,
) error {
	results := make(chan struct {
		string
		bool
	}, 2)

	runtime.wg.Add(2)
	go runtime.detectModGitlab(results, tree)
	go runtime.detectDepGitlab(results, tree)
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
