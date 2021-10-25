package gcr

import v1 "k8s.io/api/core/v1"

// Conf is the GCR cluster config required for the provisioner
type Conf struct {
	GCPProjectID string
}

// AttachGCREnv adds the relevant GCR env for the provisioner
func (conf *Conf) AttachGCREnv(env []v1.EnvVar) []v1.EnvVar {
	env = append(env, v1.EnvVar{
		Name:  "GCP_PROJECT_ID",
		Value: conf.GCPProjectID,
	})

	return env
}
