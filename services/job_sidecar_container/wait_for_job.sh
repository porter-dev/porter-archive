#!/bin/sh

# Usage: wait_for_job.sh [process_pattern]
#
# This script waits for a job to be ready before exiting. 

pattern=$1

target_pid=$(pgrep -f $pattern -l | grep -v 'job_killer.sh' | grep -v 'wait_for_job.sh' | grep -v 'grep' | awk '{ printf "%d ", $1 }' | sort)


# target_pid_arr=$(ps x | grep -v './job_killer.sh' | grep -v './wait_for_job.sh' | grep "$pattern" | awk '{ printf "%d ", $1 }' | sort)
# target_pid=$target_pid_arr

while [ ! "$target_pid" ]; do 
  sleep 0.1
  target_pid=$(pgrep -f $pattern -l | grep -v 'job_killer.sh' | grep -v 'wait_for_job.sh' | grep -v 'grep' | awk '{ printf "%d ", $1 }' | sort)

#   target_pid_arr=$(ps x | grep -v './job_killer.sh' | grep -v './wait_for_job.sh' | grep "$pattern" | awk '{ printf "%d ", $1 }' | sort)
#   target_pid=$target_pid_arr
done