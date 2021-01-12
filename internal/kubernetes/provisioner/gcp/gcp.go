package aws

import (
	v1 "k8s.io/api/core/v1"
)

// Conf wraps the GCP integration model
type Conf struct {
	GCPRegion, GCPProjectID, GCPKeyData string
}

// AttachGCPEnv adds the relevant AWS env for the provisioner
func (conf *Conf) AttachGCPEnv(env []v1.EnvVar) []v1.EnvVar {
	env = append(env, v1.EnvVar{
		Name:  "GCP_REGION",
		Value: conf.GCPRegion,
	})

	env = append(env, v1.EnvVar{
		Name:  "GCP_CREDENTIALS",
		Value: conf.GCPKeyData,
	})

	env = append(env, v1.EnvVar{
		Name:  "GCP_PROJECT_ID",
		Value: conf.GCPProjectID,
	})

	return env
}
