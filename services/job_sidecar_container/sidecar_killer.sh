#!/bin/sh

# Sends termination signal to other sidecar pods, meant to run as a pre-stop hook
# or called by ./job_killer.sh.
# 
# Usage: ./sidecar_killer.sh [target_process]

target=$1
pattern="$(printf '[%s]%s' $(echo $target | cut -c 1) $(echo $target | cut -c 2-))"
pid=$(ps x | grep -v './sidecar_killer.sh' | grep "$pattern" | awk '{ printf "%d ", $1 }'); 
kill -TERM $pid