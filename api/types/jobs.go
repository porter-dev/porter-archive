package types

import v1 "k8s.io/api/batch/v1"

const (
	URLParamJobName URLParam = "name"
)

type GetJobsResponse []v1.Job
