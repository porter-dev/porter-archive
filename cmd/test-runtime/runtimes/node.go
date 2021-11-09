package runtimes

import (
	"sync"

	nodemodulebom "github.com/paketo-buildpacks/node-module-bom"
	npminstall "github.com/paketo-buildpacks/npm-install"
	"github.com/paketo-buildpacks/packit"
	yarninstall "github.com/paketo-buildpacks/yarn-install"
)

type NodeRuntime struct {
	// An internal representation of https://github.com/paketo-buildpacks/nodejs/blob/main/buildpack.toml
	packs map[string]*BuildpackInfo
	wg    sync.WaitGroup
}

func NewNodeRuntime() *NodeRuntime {
	packs := make(map[string]*BuildpackInfo)

	// yarn
	packs["yarn"] = newBuildpackInfo()
	packs["yarn"].addPack("paketo-buildpacks/ca-certificates")
	packs["yarn"].addPack("paketo-buildpacks/node-engine")
	packs["yarn"].addPack("paketo-buildpacks/yarn")
	packs["yarn"].addPack("paketo-buildpacks/yarn-install")
	packs["yarn"].addPack("paketo-buildpacks/node-module-bom")
	packs["yarn"].addPack("paketo-buildpacks/node-run-script")
	packs["yarn"].addPack("paketo-buildpacks/yarn-start")
	packs["yarn"].addPack("paketo-buildpacks/procfile")
	packs["yarn"].addPack("paketo-buildpacks/environment-variables")
	packs["yarn"].addPack("paketo-buildpacks/image-labels")
	packs["yarn"].addEnvVar("SSL_CERT_DIR", "")
	packs["yarn"].addEnvVar("SSL_CERT_FILE", "")
	packs["yarn"].addEnvVar("BP_NODE_OPTIMIZE_MEMORY", "")
	packs["yarn"].addEnvVar("BP_NODE_PROJECT_PATH", "")
	packs["yarn"].addEnvVar("BP_NODE_VERSION", "")
	packs["yarn"].addEnvVar("BP_NODE_RUN_SCRIPTS", "")

	// npm
	packs["npm"] = newBuildpackInfo()
	packs["npm"].addPack("paketo-buildpacks/ca-certificates")
	packs["npm"].addPack("paketo-buildpacks/node-engine")
	packs["npm"].addPack("paketo-buildpacks/npm-install")
	packs["npm"].addPack("paketo-buildpacks/node-module-bom")
	packs["npm"].addPack("paketo-buildpacks/node-run-script")
	packs["npm"].addPack("paketo-buildpacks/npm-start")
	packs["npm"].addPack("paketo-buildpacks/procfile")
	packs["npm"].addPack("paketo-buildpacks/environment-variables")
	packs["npm"].addPack("paketo-buildpacks/image-labels")
	packs["npm"].addEnvVar("SSL_CERT_DIR", "")
	packs["npm"].addEnvVar("SSL_CERT_FILE", "")
	packs["npm"].addEnvVar("BP_NODE_OPTIMIZE_MEMORY", "")
	packs["npm"].addEnvVar("BP_NODE_PROJECT_PATH", "")
	packs["npm"].addEnvVar("BP_NODE_VERSION", "")
	packs["npm"].addEnvVar("BP_NODE_RUN_SCRIPTS", "")

	// no package manager
	packs["standalone"] = newBuildpackInfo()
	packs["standalone"].addPack("paketo-buildpacks/ca-certificates")
	packs["standalone"].addPack("paketo-buildpacks/node-engine")
	packs["standalone"].addPack("paketo-buildpacks/node-module-bom")
	packs["standalone"].addPack("paketo-buildpacks/node-start")
	packs["standalone"].addPack("paketo-buildpacks/procfile")
	packs["standalone"].addPack("paketo-buildpacks/environment-variables")
	packs["standalone"].addPack("paketo-buildpacks/image-labels")
	packs["standalone"].addEnvVar("SSL_CERT_DIR", "")
	packs["standalone"].addEnvVar("SSL_CERT_FILE", "")
	packs["standalone"].addEnvVar("BP_NODE_OPTIMIZE_MEMORY", "")
	packs["standalone"].addEnvVar("BP_NODE_PROJECT_PATH", "")
	packs["standalone"].addEnvVar("BP_NODE_VERSION", "")
	packs["standalone"].addEnvVar("BP_LAUNCHPOINT", "")
	packs["standalone"].addEnvVar("BP_LIVE_RELOAD_ENABLED", "")

	return &NodeRuntime{
		packs: packs,
	}
}

func (runtime *NodeRuntime) detectYarn(results chan struct {
	string
	bool
}, workingDir string) {
	yarnProjectPathParser := yarninstall.NewProjectPathParser()
	yarnVersionParser := yarninstall.NewPackageJSONParser()
	detect := yarninstall.Detect(yarnProjectPathParser, yarnVersionParser)
	_, err := detect(packit.DetectContext{
		WorkingDir: workingDir,
	})
	if err == nil {
		results <- struct {
			string
			bool
		}{"yarn", true}
	} else {
		results <- struct {
			string
			bool
		}{"yarn", false}
	}
	runtime.wg.Done()
}

func (runtime *NodeRuntime) detectNPM(results chan struct {
	string
	bool
}, workingDir string) {
	npmProjectPathParser := npminstall.NewProjectPathParser()
	npmVersionParser := npminstall.NewPackageJSONParser()
	detect := npminstall.Detect(npmProjectPathParser, npmVersionParser)
	_, err := detect(packit.DetectContext{
		WorkingDir: workingDir,
	})
	if err == nil {
		results <- struct {
			string
			bool
		}{"npm", true}
	} else {
		results <- struct {
			string
			bool
		}{"npm", false}
	}
	runtime.wg.Done()
}

func (runtime *NodeRuntime) detectStandalone(results chan struct {
	string
	bool
}, workingDir string) {
	// FIXME: the detect function seems to be working for non-node projects as well?
	detect := nodemodulebom.Detect()
	_, err := detect(packit.DetectContext{
		WorkingDir: workingDir,
	})
	if err == nil {
		results <- struct {
			string
			bool
		}{"standalone", true}
	} else {
		results <- struct {
			string
			bool
		}{"standalone", false}
	}
	runtime.wg.Done()
}

func (runtime *NodeRuntime) Detect(workingDir string) *BuildpackInfo {
	results := make(chan struct {
		string
		bool
	}, 3)

	runtime.wg.Add(3)
	go runtime.detectYarn(results, workingDir)
	go runtime.detectNPM(results, workingDir)
	go runtime.detectStandalone(results, workingDir)
	runtime.wg.Wait()
	close(results)

	detected := make(map[string]bool)
	for result := range results {
		detected[result.string] = result.bool
	}

	if detected["yarn"] {
		return runtime.packs["yarn"]
	} else if detected["npm"] {
		return runtime.packs["npm"]
	} else if detected["standalone"] {
		return runtime.packs["standalone"]
	}

	return nil
}
