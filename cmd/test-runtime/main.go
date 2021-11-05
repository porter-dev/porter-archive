package main

import (
	"log"
	"os"
	"path/filepath"

	gomodvendor "github.com/paketo-buildpacks/go-mod-vendor"
	"github.com/paketo-buildpacks/packit"
)

const GoModLocation = "go.mod"

func main() {
	if len(os.Args) < 2 {
		log.Fatalln("Usage: ./test-runtime <project directory>")
	}

	workingDir := os.Args[1]

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

	/* Not a Go project */
	log.Println("No Go project detected")
}
