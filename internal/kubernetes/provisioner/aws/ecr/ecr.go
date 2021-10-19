package ecr

import v1 "k8s.io/api/core/v1"

// Conf is the ECR cluster config required for the provisioner
type Conf struct {
	AWSRegion, ECRName string
}

// AttachECREnv adds the relevant ECR env for the provisioner
func (conf *Conf) AttachECREnv(env []v1.EnvVar) []v1.EnvVar {
	env = append(env, v1.EnvVar{
		Name:  "AWS_REGION",
		Value: conf.AWSRegion,
	})

	env = append(env, v1.EnvVar{
		Name:  "ECR_NAME",
		Value: conf.ECRName,
	})

	return env
}
