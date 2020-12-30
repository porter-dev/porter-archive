package aws

import (
	v1 "k8s.io/api/core/v1"
)

// Conf wraps the AWS integration model
type Conf struct {
	AWSRegion, AWSAccessKeyID, AWSSecretAccessKey string
}

// AttachAWSEnv adds the relevant AWS env for the provisioner
func (conf *Conf) AttachAWSEnv(env []v1.EnvVar) []v1.EnvVar {
	env = append(env, v1.EnvVar{
		Name:  "AWS_REGION",
		Value: conf.AWSRegion,
	})

	env = append(env, v1.EnvVar{
		Name:  "AWS_ACCESS_KEY_ID",
		Value: conf.AWSAccessKeyID,
	})

	env = append(env, v1.EnvVar{
		Name:  "AWS_SECRET_ACCESS_KEY",
		Value: conf.AWSSecretAccessKey,
	})

	return env
}
