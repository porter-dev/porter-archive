package buildpacks

import (
	"sync"

	depensure "github.com/paketo-buildpacks/dep-ensure"
	gomodvendor "github.com/paketo-buildpacks/go-mod-vendor"
	"github.com/paketo-buildpacks/packit"
)

type cliGoRuntime struct {
	wg sync.WaitGroup
}

func NewCLIGoRuntime() CLIRuntime {
	// adding packs to the Go runtime does not make sense
	// since we will be using a Packaeto builder that
	// already comes with the Go buildpack

	return &cliGoRuntime{}
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

func (runtime *cliGoRuntime) Detect(workingDir string) (BuildpackInfo, map[string]interface{}) {
	results := make(chan struct {
		string
		bool
	}, 3)

	runtime.wg.Add(3)
	go runtime.detectMod(results, workingDir)
	go runtime.detectDep(results, workingDir)
	runtime.wg.Wait()
	close(results)

	return BuildpackInfo{}, nil
}
