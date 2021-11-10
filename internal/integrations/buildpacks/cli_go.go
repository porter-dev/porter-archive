package buildpacks

import (
	"sync"

	depensure "github.com/paketo-buildpacks/dep-ensure"
	gomodvendor "github.com/paketo-buildpacks/go-mod-vendor"
	"github.com/paketo-buildpacks/packit"
)

type cliGoRuntime struct {
	packs map[string]*BuildpackInfo
	wg    sync.WaitGroup
}

func NewCLIGoRuntime() *cliGoRuntime {
	packs := make(map[string]*BuildpackInfo)

	// mod
	packs[mod] = newBuildpackInfo()

	// dep
	packs[dep] = newBuildpackInfo()

	// go build
	packs[standalone] = newBuildpackInfo()

	return &cliGoRuntime{
		packs: packs,
	}
}

func (runtime *cliGoRuntime) detectMod(results chan struct {
	string
	bool
}, workingDir string) {
	goModParser := gomodvendor.NewGoModParser()
	detect := gomodvendor.Detect(goModParser)
	_, err := detect(packit.DetectContext{
		WorkingDir: workingDir,
	})
	if err == nil {
		results <- struct {
			string
			bool
		}{mod, true}
	} else {
		results <- struct {
			string
			bool
		}{mod, false}
	}
	runtime.wg.Done()
}

func (runtime *cliGoRuntime) detectDep(results chan struct {
	string
	bool
}, workingDir string) {
	detect := depensure.Detect()
	_, err := detect(packit.DetectContext{
		WorkingDir: workingDir,
	})
	if err == nil {
		results <- struct {
			string
			bool
		}{dep, true}
	} else {
		results <- struct {
			string
			bool
		}{dep, false}
	}
	runtime.wg.Done()
}

func (runtime *cliGoRuntime) detectStandalone(results chan struct {
	string
	bool
}, workingDir string) {
	runtime.wg.Done()
}

func (runtime *cliGoRuntime) Detect(workingDir string) (BuildpackInfo, map[string]interface{}) {
	results := make(chan struct {
		string
		bool
	}, 3)

	runtime.wg.Add(3)
	go runtime.detectMod(results, workingDir)
	go runtime.detectDep(results, workingDir)
	go runtime.detectStandalone(results, workingDir)
	runtime.wg.Wait()
	close(results)

	return BuildpackInfo{}, nil
}
