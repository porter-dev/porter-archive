package main

import (
	"fmt"
	"log"
	"os"
	"path/filepath"

	condaenvupdate "github.com/paketo-buildpacks/conda-env-update"
	gomodvendor "github.com/paketo-buildpacks/go-mod-vendor"
	"github.com/paketo-buildpacks/packit"
	pipenvinstall "github.com/paketo-buildpacks/pipenv-install"
	pythonstart "github.com/paketo-buildpacks/python-start"
	"github.com/paketo-buildpacks/rackup"
	railsassets "github.com/paketo-buildpacks/rails-assets"
	"github.com/paketo-buildpacks/rake"
	"github.com/porter-dev/porter/internal/integrations/buildpacks"
)

const GoModLocation = "go.mod"

var workingDir string

func detectGo() {
	/* First check if it is a go.mod project */
	goModParser := gomodvendor.NewGoModParser()
	detect := gomodvendor.Detect(goModParser)

	_, err := detect(packit.DetectContext{
		WorkingDir: workingDir,
	})
	if err == nil {
		log.Println("go.mod project detected")
		return
	}

	/* Next, check if it is a Gopkg.toml */
	_, err = os.Stat(filepath.Join(workingDir, "Gopkg.toml"))
	if err == nil {
		log.Println("Gopkg.toml project detected")
		return
	}

	/* Finally, check if it is a Go vendor */
	_, err = os.Stat(filepath.Join(workingDir, "vendor"))
	if err == nil {
		log.Println("Go vendor project detected")
		return
	}

	// FIXME: what about Go projects that do not use any of the
	//        above but contain a Makefile to call 'go build'

	/* Not a Go project */
	log.Println("Not a Go project")
}

func detectPython() {
	/* Check for Pipfile project */
	pipfileParser := pipenvinstall.NewPipfileParser()
	pipfileLockParser := pipenvinstall.NewPipfileLockParser()
	detect := pipenvinstall.Detect(pipfileParser, pipfileLockParser)
	_, err := detect(packit.DetectContext{
		WorkingDir: workingDir,
	})
	if err == nil {
		log.Println("Python Pipfile project detected")
		return
	}

	/* Check for pip project */
	_, err = os.Stat(filepath.Join(workingDir, "requirements.txt"))
	if err == nil {
		log.Println("Python pip project detected")
		return
	}

	/* Check for conda project */
	detect = condaenvupdate.Detect()
	_, err = detect(packit.DetectContext{
		WorkingDir: workingDir,
	})
	if err == nil {
		log.Println("Python conda project detected")
		return
	}

	/* Check for all other possibilities of a Python project */
	detect = pythonstart.Detect()
	_, err = detect(packit.DetectContext{
		WorkingDir: workingDir,
	})
	if err == nil {
		log.Println("Python project detected")
		return
	}

	/* Not a Python project */
	log.Println("Not a Python project")
}

func detectRuby() {
	/* Check for rackup project  */
	gemParser := rackup.NewGemfileLockParser()
	detect := rackup.Detect(gemParser)
	_, err := detect(packit.DetectContext{
		WorkingDir: workingDir,
	})
	if err == nil {
		log.Println("Ruby rackup project detected")
		return
	}

	/* Check for Rails app with assets */
	railsGemfileParser := railsassets.NewGemfileParser()
	detect = railsassets.Detect(railsGemfileParser)
	_, err = detect(packit.DetectContext{
		WorkingDir: workingDir,
	})
	if err == nil {
		log.Println("Ruby rails project detected")
		return
	}

	/* Check for rakefile project */
	rakeGemfileParser := rake.NewGemfileParser()
	detect = rake.Detect(rakeGemfileParser)
	_, err = detect(packit.DetectContext{
		WorkingDir: workingDir,
	})
	if err == nil {
		log.Println("Ruby rakefile project detected")
		return
	}

	/* Not a Ruby project */
	log.Println("Not a Ruby project")
}

func main() {
	if len(os.Args) < 2 {
		log.Fatalln("Usage: ./test-runtime <project directory>")
	}

	workingDir = os.Args[1]

	nodeRuntime := buildpacks.NewCLINodeRuntime()
	buildpackInfo, data := nodeRuntime.Detect(workingDir)
	if data != nil {
		fmt.Println(data)
		for i := 0; i < len(buildpackInfo.Packs); i++ {
			fmt.Println(buildpackInfo.Packs[i])
		}
	}
}
