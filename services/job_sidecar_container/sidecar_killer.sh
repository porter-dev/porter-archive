#!/bin/sh

# Sends termination signal to other sidecar pods, meant to run as a pre-stop hook
# or called by ./job_killer.sh.
# 
# Usage: ./sidecar_killer.sh [target_process]

sidecar_pid=$(pgrep $1)


if [ -n "$sidecar_pid" ]; then
    kill -TERM $sidecar_pid

    # schedule hard kill after 30 seconds
    (sleep 30; kill -9 -${sidecar_pid} 2>/dev/null || true) &
    local killer=${!}

    # wait for processes to finish
    wait ${sidecar_pid} 2>/dev/null || true

    # children exited gracefully - cancel timer
    sleep 0.1 && kill -9 ${killer} 2>/dev/null && target_pid="" || true
fi