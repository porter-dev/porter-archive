#!/bin/sh

# Usage: job_killer.sh [-c]? [grace_period_seconds] [process_pattern] [sidecar]?
#
# This script waits for a termination signal and gracefully terminates another process before exiting. 
# 
# Attempts to gracefully kill a process by sending SIGTERM to the first process that matches 
# the pattern. If "-c" is set, it will also signal all child processes of the main process. 
# All processes are forcibly killed if they have not exited after the grace period. 
#
# Example: if process that should be killed has start command "./run_job.sh", and grace 
# period should be 30s, would run "./job_killer.sh 30 ./run_job.sh".

kill_child_procs=false

while getopts ":c" opt; do
  case $opt in
    c)
      kill_child_procs=true
  esac
done

if $kill_child_procs
then
  grace_period_seconds=$2
  target=$3
  sidecar=$4
else
  grace_period_seconds=$1
  target=$2
  sidecar=$3
fi  

pattern="$(printf '[%s]%s' $(echo $target | cut -c 1) $(echo $target | cut -c 2-))"

graceful_shutdown() {
    echo "starting graceful shutdown..."

    local timeout=$1

    echo "searching for process pattern: $pattern"

    local target_pid_arr=$(ps x | grep -v './job_killer.sh' | grep "$pattern" | awk '{ printf "%d ", $1 }' | sort)
    local target_pid=$target_pid_arr
    local list="$target_pid"

    # request graceful shutdown from target_pid
    kill -0 ${target_pid} 2>/dev/null && kill -TERM ${target_pid}

    if $kill_child_procs
    then
        for c in $(ps -o pid= --ppid $target_pid); do
          # request graceful shutdown of all children, and append to process list
          kill -0 $c 2>/dev/null && kill -TERM $c && list="$list $c" || true
        done
    fi

    if [ -n "$target_pid" ]; then
        # schedule hard kill after timeout
        (sleep ${timeout}; kill -9 -${target_pid} 2>/dev/null || true) &
        local killer=${!}

        # wait for processes to finish
        for c in $list; do
          echo "waiting for process $c"
          tail --pid=$c -f /dev/null 
        done

        wait ${list} 2>/dev/null || true

        # children exited gracefully - cancel timer
        sleep 0.1 && kill -9 ${killer} 2>/dev/null && target_pid="" || true
    fi

    [ -z "$target_pid" ] && echo "Exit Gracefully (0)" && exit 0 || echo "Dirty Exit (1)" && exit 1
}

trap 'graceful_shutdown $grace_period_seconds $target' SIGTERM SIGINT SIGHUP

echo "waiting for job to start..."

sleep 10

target_pid_arr=$(ps x | grep -v './job_killer.sh' | grep "$pattern" | awk '{ printf "%d ", $1 }' | sort)
target_pid=$target_pid_arr

if [ -n "$target_pid" ]; then
    tail --pid=$target_pid -f /dev/null &
    child=$!

    wait "$child"
fi

# run the sidecar killer, this will terminate any additional sidecars if necessary
if [ -n "$sidecar" ]; then
    echo "killing sidecar command: $sidecar"
    ./sidecar_killer.sh $sidecar
fi