package runtimes

import (
	"fmt"
	"os"
	"path/filepath"
	"sync"

	nodemodulebom "github.com/paketo-buildpacks/node-module-bom"
	npminstall "github.com/paketo-buildpacks/npm-install"
	"github.com/paketo-buildpacks/packit"
	yarninstall "github.com/paketo-buildpacks/yarn-install"
	"github.com/pelletier/go-toml"
)

const (
	yarn       = "yarn"
	npm        = "npm"
	standalone = "standalone"

	tomlFile = "nodejs.buildpack.toml"
)

type NodeRuntime struct {
	// An internal representation of https://github.com/paketo-buildpacks/nodejs/blob/main/buildpack.toml
	packs map[string]*BuildpackInfo
	wg    sync.WaitGroup
}

func NewNodeRuntime() *NodeRuntime {
	packs := make(map[string]*BuildpackInfo)

	buildpackToml, err := toml.LoadFile(filepath.Join(getExecPath(), "nodejs.buildpack.toml"))
	if err != nil {
		fmt.Printf("Error while reading %s: %v\n", tomlFile, err)
		os.Exit(1)
	}
	order := buildpackToml.Get("order").([]*toml.Tree)

	// yarn
	packs[yarn] = newBuildpackInfo()
	yarnGroup := order[0].GetArray("group").([]*toml.Tree)
	for i := 0; i < len(yarnGroup); i++ {
		packs[yarn].addPack(
			buildpackOrderGroupInfo{
				ID:       yarnGroup[i].Get("id").(string),
				Optional: yarnGroup[i].GetDefault("optional", false).(bool),
				Version:  yarnGroup[i].Get("version").(string),
			},
		)
	}
	packs[yarn].addEnvVar("SSL_CERT_DIR", "")
	packs[yarn].addEnvVar("SSL_CERT_FILE", "")
	packs[yarn].addEnvVar("BP_NODE_OPTIMIZE_MEMORY", "")
	packs[yarn].addEnvVar("BP_NODE_PROJECT_PATH", "")
	packs[yarn].addEnvVar("BP_NODE_VERSION", "")
	packs[yarn].addEnvVar("BP_NODE_RUN_SCRIPTS", "")

	// npm
	packs[npm] = newBuildpackInfo()
	npmGroup := order[1].GetArray("group").([]*toml.Tree)
	for i := 0; i < len(npmGroup); i++ {
		packs[npm].addPack(
			buildpackOrderGroupInfo{
				ID:       npmGroup[i].Get("id").(string),
				Optional: npmGroup[i].GetDefault("optional", false).(bool),
				Version:  npmGroup[i].Get("version").(string),
			},
		)
	}
	packs[npm].addEnvVar("SSL_CERT_DIR", "")
	packs[npm].addEnvVar("SSL_CERT_FILE", "")
	packs[npm].addEnvVar("BP_NODE_OPTIMIZE_MEMORY", "")
	packs[npm].addEnvVar("BP_NODE_PROJECT_PATH", "")
	packs[npm].addEnvVar("BP_NODE_VERSION", "")
	packs[npm].addEnvVar("BP_NODE_RUN_SCRIPTS", "")

	// no package manager
	packs[standalone] = newBuildpackInfo()
	standaloneGroup := order[2].GetArray("group").([]*toml.Tree)
	for i := 0; i < len(standaloneGroup); i++ {
		packs[standalone].addPack(
			buildpackOrderGroupInfo{
				ID:       standaloneGroup[i].Get("id").(string),
				Optional: standaloneGroup[i].GetDefault("optional", false).(bool),
				Version:  standaloneGroup[i].Get("version").(string),
			},
		)
	}
	packs[standalone].addEnvVar("SSL_CERT_DIR", "")
	packs[standalone].addEnvVar("SSL_CERT_FILE", "")
	packs[standalone].addEnvVar("BP_NODE_OPTIMIZE_MEMORY", "")
	packs[standalone].addEnvVar("BP_NODE_PROJECT_PATH", "")
	packs[standalone].addEnvVar("BP_NODE_VERSION", "")
	packs[standalone].addEnvVar("BP_LAUNCHPOINT", "")
	packs[standalone].addEnvVar("BP_LIVE_RELOAD_ENABLED", "")

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
		}{yarn, true}
	} else {
		results <- struct {
			string
			bool
		}{yarn, false}
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
		}{npm, true}
	} else {
		results <- struct {
			string
			bool
		}{npm, false}
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
		}{standalone, true}
	} else {
		results <- struct {
			string
			bool
		}{standalone, false}
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

	if detected[yarn] {
		return runtime.packs[yarn]
	} else if detected[npm] {
		return runtime.packs[npm]
	} else if detected[standalone] {
		return runtime.packs[standalone]
	}

	return nil
}
