package main

import (
	"log"
	"os"
	"path/filepath"

	condaenvupdate "github.com/paketo-buildpacks/conda-env-update"
	gomodvendor "github.com/paketo-buildpacks/go-mod-vendor"
	"github.com/paketo-buildpacks/packit"
	pipenvinstall "github.com/paketo-buildpacks/pipenv-install"
	pythonstart "github.com/paketo-buildpacks/python-start"
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

func detectNode() {
	/* Not a Node project */
	log.Println("Not a Node project")
}

func detectRuby() {
	/* Not a Ruby project */
	log.Println("Not a Ruby project")
}

func main() {
	if len(os.Args) < 2 {
		log.Fatalln("Usage: ./test-runtime <project directory>")
	}

	workingDir = os.Args[1]

	detectGo()
	detectPython()
	detectNode()
	detectRuby()
}
