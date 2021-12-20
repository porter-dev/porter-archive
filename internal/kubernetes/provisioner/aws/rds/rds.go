package rds

import v1 "k8s.io/api/core/v1"

// Conf is the RDS config required for the provisioner
type Conf struct {
	AWSRegion    string
	DBName       string
	PGVersion    string
	InstanceType string
	StorageClass string
	Username     string
	Password     string
	VPCName      string
	IssuerEmail  string
}

// AttachRDSEnv adds the relevant RDS env for the provisioner
func (conf *Conf) AttachRDSEnv(env []v1.EnvVar) []v1.EnvVar {
	env = append(env, v1.EnvVar{
		Name:  "AWS_REGION",
		Value: conf.AWSRegion,
	})

	env = append(env, v1.EnvVar{
		Name:  "DB_NAME",
		Value: conf.DBName,
	})

	env = append(env, v1.EnvVar{
		Name:  "PG_VERSION",
		Value: conf.PGVersion,
	})

	env = append(env, v1.EnvVar{
		Name:  "INSTANCE_TYPE",
		Value: conf.InstanceType,
	})

	env = append(env, v1.EnvVar{
		Name:  "STORAGE_CLASS",
		Value: conf.StorageClass,
	})

	env = append(env, v1.EnvVar{
		Name:  "USERNAME",
		Value: conf.Username,
	})

	env = append(env, v1.EnvVar{
		Name:  "PASSWORD",
		Value: conf.Password,
	})

	env = append(env, v1.EnvVar{
		Name:  "VPC_NAME",
		Value: conf.VPCName,
	})

	env = append(env, v1.EnvVar{
		Name:  "ISSUER_EMAIL",
		Value: conf.IssuerEmail,
	})

	return env
}
