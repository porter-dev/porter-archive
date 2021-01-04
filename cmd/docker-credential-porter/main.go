package main

import (
	"github.com/docker/docker-credential-helpers/credentials"
	"github.com/porter-dev/porter/cmd/docker-credential-porter/helper"
)

func main() {
	credentials.Serve(&helper.PorterHelper{})
}
