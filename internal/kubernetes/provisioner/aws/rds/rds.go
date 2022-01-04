package rds

import (
	v1 "k8s.io/api/core/v1"
)

// Conf is the RDS config required for the provisioner
type Conf struct {
	AWSRegion             string
	DBName                string
	MachineType           string
	DBEngineVersion       string
	DBFamily              string
	DBMajorEngineVersion  string
	DBAllocatedStorage    string
	DBMaxAllocatedStorage string
	DBStorageEncrypted    string
	Subnet1               string
	Subnet2               string
	Subnet3               string

	Username           string
	Password           string
	VPCID              string
	IssuerEmail        string
	DeletionProtection string
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
		Name:  "DB_MACHINE_TYPE",
		Value: conf.MachineType,
	})

	env = append(env, v1.EnvVar{
		Name:  "DB_ENGINE_VERSION",
		Value: conf.DBEngineVersion,
	})

	env = append(env, v1.EnvVar{
		Name:  "DB_FAMILY",
		Value: conf.DBFamily,
	})

	env = append(env, v1.EnvVar{
		Name:  "DB_MAJOR_ENGINE_VERSION",
		Value: conf.DBMajorEngineVersion,
	})

	env = append(env, v1.EnvVar{
		Name:  "DB_ALLOCATED_STORAGE",
		Value: conf.DBAllocatedStorage,
	})

	env = append(env, v1.EnvVar{
		Name:  "DB_MAX_ALLOCATED_STORAGE",
		Value: conf.DBMaxAllocatedStorage,
	})

	env = append(env, v1.EnvVar{
		Name:  "PORTER_CLUSTER_SUBNET_1",
		Value: conf.Subnet1,
	})

	env = append(env, v1.EnvVar{
		Name:  "PORTER_CLUSTER_SUBNET_2",
		Value: conf.Subnet2,
	})

	env = append(env, v1.EnvVar{
		Name:  "PORTER_CLUSTER_SUBNET_3",
		Value: conf.Subnet3,
	})

	env = append(env, v1.EnvVar{
		Name:  "DB_STORAGE_ENCRYPTED",
		Value: conf.DBStorageEncrypted,
	})

	env = append(env, v1.EnvVar{
		Name:  "DB_USER",
		Value: conf.Username,
	})

	env = append(env, v1.EnvVar{
		Name:  "DB_PASSWD",
		Value: conf.Password,
	})

	// TODO: change to VPC_ID instead of vpc name
	env = append(env, v1.EnvVar{
		Name:  "PORTER_CLUSTER_VPC",
		Value: conf.VPCID,
	})

	env = append(env, v1.EnvVar{
		Name:  "ISSUER_EMAIL",
		Value: conf.IssuerEmail,
	})

	env = append(env, v1.EnvVar{
		Name:  "DB_DELETION_PROTECTION",
		Value: conf.DeletionProtection,
	})

	return env
}
