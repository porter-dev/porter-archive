package main

import (
	"flag"
	"fmt"
	"os"

	"github.com/docker/docker-credential-helpers/credentials"
	"github.com/porter-dev/porter/cmd/docker-credential-porter/helper"
)

// Version will be linked by an ldflag during build
var Version string = "v0.4.0"

func main() {
	var versionFlag bool
	flag.BoolVar(&versionFlag, "version", false, "print version and exit")
	flag.Parse()

	// Exit safely when version is used
	if versionFlag {
		fmt.Println(Version)
		os.Exit(0)
	}

	helper := helper.NewPorterHelper(Version == "dev")

	credentials.Serve(helper)
}
