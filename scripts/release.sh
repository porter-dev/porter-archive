#!/bin/bash

# Step 0 -- ensure that:
# (1) GITHUB_TOKEN exists as an env variable
# (2) Apple ID password exists in keychain

# Step 1 -- build for linux/windows inside a docker container
docker run --rm --privileged \
-v $PWD:/go/src/github.com/porter-dev/porter \
-v /var/run/docker.sock:/var/run/docker.sock \
-w /go/src/github.com/porter-dev/porter \
mailchain/goreleaser-xcgo "--rm-dist --skip-validate"

# Step 2 -- build for MacOS using notarization tool
goreleaser --rm-dist --config .darwin.goreleaser.yml --skip-validate