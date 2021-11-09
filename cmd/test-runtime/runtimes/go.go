package runtimes

import (
	"sync"

	gomodvendor "github.com/paketo-buildpacks/go-mod-vendor"
	"github.com/paketo-buildpacks/packit"
)

type goRuntime struct {
	packs map[string]*BuildpackInfo
	wg    sync.WaitGroup
}

const (
	mod = "mod"
	dep = "dep"
)

func NewGoRuntime() *goRuntime {
	packs := make(map[string]*BuildpackInfo)

	// mod
	packs[mod] = newBuildpackInfo()

	// dep
	packs[dep] = newBuildpackInfo()

	// go build
	packs[standalone] = newBuildpackInfo()

	return &goRuntime{
		packs: packs,
	}
}

func (runtime *goRuntime) detectMod(results chan struct {
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

func (runtime *goRuntime) detectDep(results chan struct {
	string
	bool
}, workingDir string) {

	runtime.wg.Done()
}

func (runtime *goRuntime) detectStandalone(results chan struct {
	string
	bool
}, workingDir string) {

	runtime.wg.Done()
}

func (runtime *goRuntime) Detect(workingDir string) (BuildpackInfo, map[string]interface{}) {
	results := make(chan struct {
		string
		bool
	}, 3)

	runtime.wg.Add(3)
	go runtime.detectMod(results, workingDir)
	go runtime.detectDep(results, workingDir)
	go runtime.detectStandalone(results, workingDir)
	runtime.wg.Wait()

	return BuildpackInfo{}, nil
}
