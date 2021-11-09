package buildpacks

import (
	"fmt"
	"os"
	"path/filepath"
	"sync"

	noderunscript "github.com/paketo-buildpacks/node-run-script"
	nodestart "github.com/paketo-buildpacks/node-start"
	npminstall "github.com/paketo-buildpacks/npm-install"
	"github.com/paketo-buildpacks/packit"
	yarninstall "github.com/paketo-buildpacks/yarn-install"
	"github.com/pelletier/go-toml"
)

const nodejsTomlFile = "nodejs.buildpack.toml"

type cliNodeRuntime struct {
	packs map[string]*BuildpackInfo
	wg    sync.WaitGroup
}

func NewCLINodeRuntime() *cliNodeRuntime {
	packs := make(map[string]*BuildpackInfo)

	buildpackToml, err := toml.LoadFile(filepath.Join(getExecPath(), nodejsTomlFile))
	if err != nil {
		fmt.Printf("Error while reading %s: %v\n", nodejsTomlFile, err)
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

	return &cliNodeRuntime{
		packs: packs,
	}
}

func (runtime *cliNodeRuntime) detectYarn(results chan struct {
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

func (runtime *cliNodeRuntime) detectNPM(results chan struct {
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

func (runtime *cliNodeRuntime) detectStandalone(results chan struct {
	string
	bool
}, workingDir string) {
	appFinder := nodestart.NewNodeApplicationFinder()
	detect := nodestart.Detect(appFinder)
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

func (runtime *cliNodeRuntime) Detect(workingDir string) (BuildpackInfo, map[string]interface{}) {
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

	atLeastOne := false
	detected := make(map[string]bool)
	for result := range results {
		if result.bool {
			atLeastOne = true
		}
		detected[result.string] = result.bool
	}

	if atLeastOne {
		if detected[yarn] || detected[npm] {
			// it is safe to assume that the project contains a package.json
			packageJSONPath := filepath.Join(workingDir, "package.json")

			scriptManager := noderunscript.NewScriptManager()
			scripts, err := scriptManager.GetPackageScripts(workingDir)
			if err != nil {
				fmt.Printf("Error reading %s: %v\n", packageJSONPath, err)
				os.Exit(1)
			}

			packageJSONParser := npminstall.NewPackageJSONParser()
			engineVersion, err := packageJSONParser.ParseVersion(packageJSONPath)
			if err != nil {
				fmt.Printf("Error reading %s: %v\n", packageJSONPath, err)
				os.Exit(1)
			}

			if detected[yarn] {
				return *runtime.packs[yarn], map[string]interface{}{"scripts": scripts, "engine_version": engineVersion}
			} else {
				return *runtime.packs[npm], map[string]interface{}{"scripts": scripts, "engine_version": engineVersion}
			}
		}

		if detected[standalone] {
			return *runtime.packs[standalone], map[string]interface{}{}
		}
	}

	return BuildpackInfo{}, nil
}
