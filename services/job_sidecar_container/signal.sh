#!/bin/sh

# Sends termination signal to job_killer.sh, which triggers the job shutdown process.

pid=$(ps x | grep "[.]/job_killer.sh" | awk '{ printf "%d ", $1 }'); 
kill -TERM $pid