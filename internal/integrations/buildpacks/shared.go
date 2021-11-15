package buildpacks

import (
	"github.com/google/go-github/github"
)

const (
	// NodeJS
	yarn = "yarn"
	npm  = "npm"

	// Go
	mod = "mod"
	dep = "dep"

	// Python
	pipenv = "pipenv"
	pip    = "pip"
	conda  = "conda"

	// Ruby
	puma      = "puma"
	thin      = "thin"
	unicorn   = "unicorn"
	passenger = "passenger"
	rackup    = "rackup"
	rake      = "rake"

	// Common
	standalone = "standalone"
)

type buildpackOrderGroupInfo struct {
	ID       string `json:"id"`
	Optional bool   `json:"optional"`
	Version  string `json:"version"`
}

type BuildpackInfo struct {
	Packs []buildpackOrderGroupInfo `json:"packs"`
	// FIXME: env vars for https://github.com/paketo-buildpacks/environment-variables
	//        and for https://github.com/paketo-buildpacks/image-labels
	EnvVars map[string]string `json:"env_vars"`
}

func newBuildpackInfo() *BuildpackInfo {
	return &BuildpackInfo{
		EnvVars: make(map[string]string),
	}
}

func (info *BuildpackInfo) addPack(pack buildpackOrderGroupInfo) {
	info.Packs = append(info.Packs, pack)
}

func (info *BuildpackInfo) addEnvVar(id string, val string) {
	info.EnvVars[id] = val
}

type RuntimeResponse struct {
	Name       string                 `json:"name"`
	Buildpacks *BuildpackInfo         `json:"buildpacks"`
	Runtime    string                 `json:"runtime"`
	Config     map[string]interface{} `json:"config"`
}

type Runtime interface {
	Detect(
		*github.Client, // github client to pull contents of files
		[]*github.RepositoryContent, // the root folder structure of the git repo
		string, // owner
		string, // name
		string, // path
		github.RepositoryContentGetOptions, // SHA, branch or tag
	) *RuntimeResponse
}

// Runtimes is a list of all API runtimes
var Runtimes = []Runtime{
	NewGoRuntime(),
	NewNodeRuntime(),
	NewPythonRuntime(),
	NewRubyRuntime(),
}
