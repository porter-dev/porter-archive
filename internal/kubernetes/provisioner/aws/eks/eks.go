package eks

import v1 "k8s.io/api/core/v1"

// Conf is the EKS cluster config required for the provisioner
type Conf struct {
	ClusterName string
}

// AttachEKSEnv adds the relevant EKS env for the provisioner
func (conf *Conf) AttachEKSEnv(env []v1.EnvVar) []v1.EnvVar {
	env = append(env, v1.EnvVar{
		Name:  "EKS_CLUSTER_NAME",
		Value: conf.ClusterName,
	})

	return env
}
