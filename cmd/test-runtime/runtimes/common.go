package runtimes

import (
	"os"
	"path/filepath"
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

type Runtime interface {
	Detect(string) (BuildpackInfo, map[string]interface{})
}
