#!/bin/bash
#
# Accepts the version as an argument

go build -ldflags="-w -s -X 'github.com/porter-dev/porter/cli/cmd.Version=$1'" -a -tags cli -o ./porter.exe ./cli

mkdir -p /release/windows
zip --junk-paths /release/windows/porter_$1_Windows_x86_64.zip ./porter.exe