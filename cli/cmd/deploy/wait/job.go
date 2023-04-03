package wait

import (
	"context"
	"fmt"
	"strconv"
	"time"

	"github.com/fatih/color"
	api "github.com/porter-dev/porter/api/client"
	v1 "k8s.io/api/batch/v1"
)

type WaitOpts struct {
	ProjectID, ClusterID uint
	Namespace, Name      string
}

// WaitForJob waits for a job with a given name/namespace to complete its run
func WaitForJob(client *api.Client, opts *WaitOpts) error {
	// get the job release
	jobRelease, err := client.GetRelease(context.Background(), opts.ProjectID, opts.ClusterID, opts.Namespace, opts.Name)
	if err != nil {
		return err
	}

	// make sure the job chart has a manual job running
	pausedVal, ok := jobRelease.Release.Config["paused"]
	pausedErr := fmt.Errorf("this job template is not currently running a manual job")

	if !ok {
		return pausedErr
	}

	if pausedValBool, ok := pausedVal.(bool); ok && pausedValBool {
		return pausedErr
	}

	// attempt to parse out the timeout value for the job, given by `sidecar.timeout`
	// if it does not exist, we set the default to 30 minutes
	timeoutVal := getJobTimeoutValue(jobRelease.Release.Config)

	color.New(color.FgYellow).Printf("Waiting for timeout seconds %.1f\n", timeoutVal.Seconds())

	// if no job exists with the given revision, wait for the timeout value
	timeWait := time.Now().Add(timeoutVal)

	for time.Now().Before(timeWait) {
		// get the jobs for that job chart
		jobs, err := client.GetJobs(context.Background(), opts.ProjectID, opts.ClusterID, opts.Namespace, opts.Name)
		if err != nil {
			return err
		}

		job := getJobMatchingRevision(uint(jobRelease.Release.Version), jobs)

		if job == nil {
			time.Sleep(10 * time.Second)
			continue
		}

		// once job is running, wait for status to be completed, or failed
		// if failed, exit with non-zero exit code
		if job.Status.Failed > 0 {
			return fmt.Errorf("job failed")
		}

		if job.Status.Succeeded > 0 {
			return nil
		}

		// otherwise, return no error
		time.Sleep(10 * time.Second)
	}

	return fmt.Errorf("timed out waiting for job")
}

func getJobMatchingRevision(revision uint, jobs []v1.Job) *v1.Job {
	for _, job := range jobs {
		revisionLabel, revisionLabelExists := job.Labels["helm.sh/revision"]

		if !revisionLabelExists {
			continue
		}

		jobRevision, err := strconv.ParseUint(revisionLabel, 10, 64)
		if err != nil {
			continue
		}

		if uint(jobRevision) == revision {
			return &job
		}
	}

	return nil
}

func getJobTimeoutValue(values map[string]interface{}) time.Duration {
	defaultTimeout := time.Minute * 60
	sidecarInter, ok := values["sidecar"]

	if !ok {
		return defaultTimeout
	}

	sidecarVal, ok := sidecarInter.(map[string]interface{})

	if !ok {
		return defaultTimeout
	}

	timeoutInter, ok := sidecarVal["timeout"]

	if !ok {
		return defaultTimeout
	}

	timeoutVal, ok := timeoutInter.(float64)

	if !ok {
		return defaultTimeout
	}

	return time.Second * time.Duration(timeoutVal)
}
