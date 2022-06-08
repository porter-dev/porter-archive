package buildpacks

import (
	"github.com/google/go-github/v41/github"
	"github.com/xanzy/go-gitlab"
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

	// Builders
	PaketoBuilder = "paketo"
	HerokuBuilder = "heroku"
)

type BuildpackInfo struct {
	Name      string                 `json:"name"`
	Buildpack string                 `json:"buildpack"`
	Config    map[string]interface{} `json:"config"`
}

type BuilderInfo struct {
	Name     string          `json:"name"`
	Builders []string        `json:"builders"`
	Detected []BuildpackInfo `json:"detected"`
	Others   []BuildpackInfo `json:"others"`
}

type Runtime interface {
	DetectGithub(
		*github.Client, // github client to pull contents of files
		[]*github.RepositoryContent, // the root folder structure of the git repo
		string, // owner
		string, // name
		string, // path
		github.RepositoryContentGetOptions, // SHA, branch or tag
		*BuilderInfo, // paketo
		*BuilderInfo, // heroku
	) error
	DetectGitlab(
		*gitlab.Client, // github client to pull contents of files
		[]*gitlab.TreeNode, // the root folder structure of the git repo
		string, // owner
		string, // name
		string, // path
		string, // SHA, branch or tag
		*BuilderInfo, // paketo
		*BuilderInfo, // heroku
	) error
}

// Runtimes is a list of all API runtimes
var Runtimes = []Runtime{
	NewGoRuntime(),
	NewNodeRuntime(),
	NewPythonRuntime(),
	NewRubyRuntime(),
}
