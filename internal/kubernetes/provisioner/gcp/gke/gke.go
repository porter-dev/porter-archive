package gke

import v1 "k8s.io/api/core/v1"

// Conf is the GKE cluster config required for the provisioner
type Conf struct {
	GCPRegion, GCPProjectID, ClusterName, IssuerEmail string
}

// AttachGKEEnv adds the relevant GKE env for the provisioner
func (conf *Conf) AttachGKEEnv(env []v1.EnvVar) []v1.EnvVar {
	env = append(env, v1.EnvVar{
		Name:  "GCP_REGION",
		Value: conf.GCPRegion,
	})

	env = append(env, v1.EnvVar{
		Name:  "GCP_PROJECT_ID",
		Value: conf.GCPProjectID,
	})

	env = append(env, v1.EnvVar{
		Name:  "GKE_CLUSTER_NAME",
		Value: conf.ClusterName,
	})

	env = append(env, v1.EnvVar{
		Name:  "ISSUER_EMAIL",
		Value: conf.IssuerEmail,
	})

	return env
}
