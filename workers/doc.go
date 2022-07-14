/*

                            === Porter Worker Pool and Job Queue System ===

This software is intended to be deployed alongside the main Porter server and dashboard and act as a background
worker pool for certain jobs that the Porter server should be running as separate processes / goroutines periodically
or at-will, depending on the task at hand.

TERMINOLOGIES

  - The terms `worker pool`, `pool`, `Go application` are interchangably used to denote this application.
  - Jobs should have their unique string identifiers, denoted as IDs for short.

ARCHITECTURE

  - The worker pool is a Go application that takes in environment variables `MAX_WORKERS` and `MAX_QUEUE` to
    denote the maximum number of workers and maximum number of jobs in the queue, respectively.
  - The worker pool has specific jobs that it can execute, written separately with their own logic flow.
  - The individual jobs need to have a unique string identifier.
  - The jobs should be registered at startup time with their respective unique identifiers for the worker pool
    to correctly relay execution information to the correct job.
  - The worker pool has an exposed HTTP POST endpoint to enqueue jobs with their IDs. Depending on the kind of job,
    a job can expect to receive a body of JSON data in the HTTP request.
  - By exposing an HTTP endpoint, the worker pool can be called to enqueue jobs using crontab and other sources.

*/

package main
