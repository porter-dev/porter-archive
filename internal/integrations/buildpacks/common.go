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
	standalone = "standalone"
)

type buildpackOrderGroupInfo struct {
	ID       string
	Optional bool
	Version  string
}

type BuildpackInfo struct {
	Packs []buildpackOrderGroupInfo
	// FIXME: env vars for https://github.com/paketo-buildpacks/environment-variables
	//        and for https://github.com/paketo-buildpacks/image-labels
	EnvVars map[string]string
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

type CLIRuntime interface {
	Detect(string) (BuildpackInfo, map[string]interface{})
}

type APIRuntime interface {
	Detect([]*github.RepositoryContent, string, string, string, github.RepositoryContentGetOptions) map[string]interface{}
}
