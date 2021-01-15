package doks

import (
	v1 "k8s.io/api/core/v1"
)

// Conf is just a DO token
type Conf struct {
	DORegion, DOKSClusterName string
}

// AttachDOKSEnv adds the relevant DO env for the provisioner
func (conf *Conf) AttachDOKSEnv(env []v1.EnvVar) []v1.EnvVar {
	env = append(env, v1.EnvVar{
		Name:  "DO_REGION",
		Value: conf.DORegion,
	})

	env = append(env, v1.EnvVar{
		Name:  "DOKS_CLUSTER_NAME",
		Value: conf.DOKSClusterName,
	})

	return env
}
