#!/bin/bash
#
# Accepts the version as an argument

go build -ldflags="-w -s -X 'github.com/porter-dev/porter/cli/cmd.Version=$1'" -a -tags cli -o ./porter.exe ./cli &
go build -ldflags="-w -s -X 'main.Version=$1'" -a -o ./docker-credential-porter.exe ./cmd/docker-credential-porter/ &
go build -ldflags="-w -s -X 'main.Version=$1'" -a -tags ee -o ./portersvr.exe ./cmd/app/ &
wait

mkdir -p /release/windows
zip --junk-paths /release/windows/porter_$1_Windows_x86_64.zip ./porter.exe
zip --junk-paths /release/windows/portersvr_$1_Windows_x86_64.zip ./portersvr.exe
zip --junk-paths /release/windows/docker-credential-porter_$1_Windows_x86_64.zip ./docker-credential-porter.exe 
