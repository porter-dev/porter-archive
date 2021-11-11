package buildpacks

import (
	"os"
	"path/filepath"

	"github.com/google/go-github/github"
)

const (
	yarn       = "yarn"
	npm        = "npm"
	mod        = "mod"
	dep        = "dep"
	pipenv     = "pipenv"
	pip        = "pip"
	conda      = "conda"
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

func getExecPath() string {
	ex, err := os.Executable()
	if err != nil {
		panic(err)
	}
	return filepath.Dir(ex)
}

type RuntimeResponse struct {
	Name       string                 `json:"name"`
	Buildpacks *BuildpackInfo         `json:"buildpacks"`
	Runtime    string                 `json:"runtime"`
	Config     map[string]interface{} `json:"config"`
}

type CLIRuntime interface {
	Detect(string) (BuildpackInfo, map[string]interface{})
}

type APIRuntime interface {
	Detect(
		*github.Client,
		[]*github.RepositoryContent,
		string,
		string,
		string,
		github.RepositoryContentGetOptions,
	) *RuntimeResponse
}

// APIRuntimes is a list of all API runtimes
var APIRuntimes = []APIRuntime{
	NewAPIGoRuntime(),
	NewAPINodeRuntime(),
	NewAPIPythonRuntime(),
}
