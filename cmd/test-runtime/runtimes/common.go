package runtimes

type BuildpackInfo struct {
	Packs []string
	// FIXME: env vars for https://github.com/paketo-buildpacks/environment-variables
	//        and for https://github.com/paketo-buildpacks/image-labels
	Env map[string]string
}

func newBuildpackInfo() *BuildpackInfo {
	return &BuildpackInfo{
		Env: make(map[string]string),
	}
}

func (info *BuildpackInfo) addPack(pack string) {
	info.Packs = append(info.Packs, pack)
}

func (info *BuildpackInfo) addEnvVar(id string, val string) {
	info.Env[id] = val
}

type Runtime interface {
	Detect(string) *BuildpackInfo
}
