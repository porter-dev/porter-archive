package do

import (
	v1 "k8s.io/api/core/v1"
)

// Conf is just a DO token
type Conf struct {
	DOToken string
}

// AttachDOEnv adds the relevant DO env for the provisioner
func (conf *Conf) AttachDOEnv(env []v1.EnvVar) []v1.EnvVar {
	env = append(env, v1.EnvVar{
		Name:  "DO_TOKEN",
		Value: conf.DOToken,
	})

	return env
}
