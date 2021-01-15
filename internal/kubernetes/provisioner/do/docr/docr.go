package docr

import (
	v1 "k8s.io/api/core/v1"
)

// Conf is just a DO token
type Conf struct {
	DOCRName, DOCRSubscriptionTier string
}

// AttachDOCREnv adds the relevant DO env for the provisioner
func (conf *Conf) AttachDOCREnv(env []v1.EnvVar) []v1.EnvVar {
	env = append(env, v1.EnvVar{
		Name:  "DOCR_NAME",
		Value: conf.DOCRName,
	})

	env = append(env, v1.EnvVar{
		Name:  "DOCR_SUBSCRIPTION_TIER",
		Value: conf.DOCRSubscriptionTier,
	})

	return env
}
