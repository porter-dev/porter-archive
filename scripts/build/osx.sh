#!/bin/bash
#
# Accepts the version as an argument

go build -ldflags="-w -s -X 'github.com/porter-dev/porter/cli/cmd.Version=$1'" -a -tags cli -o ./porter ./cli &
go build -ldflags="-w -s -X 'main.Version=$1'" -a -o ./docker-credential-porter ./cmd/docker-credential-porter/ &
go build -ldflags="-w -s -X 'main.Version=$1'" -a -tags ee -o ./portersvr ./cmd/app/ &
wait

mkdir -p /release/darwin
zip --junk-paths /release/darwin/UNSIGNED_porter_$1_Darwin_x86_64.zip ./porter
zip --junk-paths /release/darwin/UNSIGNED_portersvr_$1_Darwin_x86_64.zip ./portersvr
zip --junk-paths /release/darwin/UNSIGNED_docker-credential-porter_$1_Darwin_x86_64.zip ./docker-credential-porter