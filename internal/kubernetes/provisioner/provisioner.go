package provisioner

import (
	"fmt"

	batchv1 "k8s.io/api/batch/v1"
	v1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	"github.com/porter-dev/porter/api/server/shared/config/env"
	"github.com/porter-dev/porter/internal/kubernetes/provisioner/aws"
	"github.com/porter-dev/porter/internal/kubernetes/provisioner/aws/ecr"
	"github.com/porter-dev/porter/internal/kubernetes/provisioner/aws/eks"
	"github.com/porter-dev/porter/internal/kubernetes/provisioner/do"
	"github.com/porter-dev/porter/internal/kubernetes/provisioner/do/docr"
	"github.com/porter-dev/porter/internal/kubernetes/provisioner/do/doks"
	"github.com/porter-dev/porter/internal/kubernetes/provisioner/input"

	"github.com/porter-dev/porter/internal/kubernetes/provisioner/gcp"
	"github.com/porter-dev/porter/internal/kubernetes/provisioner/gcp/gke"
)

// InfraOption is a type of infrastructure that can be provisioned
type InfraOption string

// The list of infra options
const (
	Test InfraOption = "test"
	ECR  InfraOption = "ecr"
	EKS  InfraOption = "eks"
	GCR  InfraOption = "gcr"
	GKE  InfraOption = "gke"
	DOCR InfraOption = "docr"
	DOKS InfraOption = "doks"
)

// Conf is the config required to start a provisioner container
type Conf struct {
	Kind                InfraOption
	Name                string
	Namespace           string
	ID                  string
	Redis               *env.RedisConf
	Postgres            *env.DBConf
	Operation           ProvisionerOperation
	ProvisionerImageTag string
	ImagePullSecret     string
	LastApplied         []byte

	// provider-specific configurations

	// AWS
	AWS *aws.Conf
	ECR *ecr.Conf
	EKS *eks.Conf

	// GKE
	GCP *gcp.Conf
	GKE *gke.Conf

	// DO
	DO   *do.Conf
	DOCR *docr.Conf
	DOKS *doks.Conf
}

type ProvisionerOperation string

const (
	Apply   ProvisionerOperation = "apply"
	Destroy ProvisionerOperation = "destroy"
)

// GetProvisionerJobTemplate returns the manifest that should be applied to
// create a provisioning job
func (conf *Conf) GetProvisionerJobTemplate() (*batchv1.Job, error) {
	operation := string(conf.Operation)

	if operation == "" {
		operation = string(Apply)
	}

	env := make([]v1.EnvVar, 0)

	env = conf.attachDefaultEnv(env)

	ttl := int32(3600)

	backoffLimit := int32(1)

	labels := map[string]string{
		"app": "provisioner",
	}

	args := make([]string, 0)

	switch conf.Kind {
	case Test:
		args = []string{operation, "test", "hello"}
	case ECR:
		args = []string{operation, "ecr"}

		if len(conf.LastApplied) > 0 {
			inputConf, err := input.GetECRInput(conf.LastApplied)

			if err != nil {
				return nil, err
			}

			conf.AWS.AWSAccessKeyID = inputConf.AWSAccessKey
			conf.AWS.AWSSecretAccessKey = inputConf.AWSSecretKey
			conf.AWS.AWSRegion = inputConf.AWSRegion
			conf.ECR.ECRName = inputConf.ECRName
		} else {
			inputConf := &input.ECR{
				AWSRegion:    conf.AWS.AWSRegion,
				AWSAccessKey: conf.AWS.AWSAccessKeyID,
				AWSSecretKey: conf.AWS.AWSSecretAccessKey,
				ECRName:      conf.ECR.ECRName,
			}

			lastApplied, err := inputConf.GetInput()

			if err != nil {
				return nil, err
			}

			conf.LastApplied = lastApplied
		}

		env = conf.AWS.AttachAWSEnv(env)
		env = conf.ECR.AttachECREnv(env)
	case EKS:
		args = []string{operation, "eks"}

		if len(conf.LastApplied) > 0 {
			inputConf, err := input.GetEKSInput(conf.LastApplied)

			if err != nil {
				return nil, err
			}

			conf.AWS.AWSAccessKeyID = inputConf.AWSAccessKey
			conf.AWS.AWSSecretAccessKey = inputConf.AWSSecretKey
			conf.AWS.AWSRegion = inputConf.AWSRegion
			conf.EKS.ClusterName = inputConf.ClusterName
		} else {
			inputConf := &input.EKS{
				AWSRegion:    conf.AWS.AWSRegion,
				AWSAccessKey: conf.AWS.AWSAccessKeyID,
				AWSSecretKey: conf.AWS.AWSSecretAccessKey,
				ClusterName:  conf.EKS.ClusterName,
				MachineType:  conf.EKS.MachineType,
			}

			lastApplied, err := inputConf.GetInput()

			if err != nil {
				return nil, err
			}

			conf.LastApplied = lastApplied
		}

		env = conf.AWS.AttachAWSEnv(env)
		env = conf.EKS.AttachEKSEnv(env)
	case GCR:
		args = []string{operation, "gcr"}

		if len(conf.LastApplied) > 0 {
			inputConf, err := input.GetGCRInput(conf.LastApplied)

			if err != nil {
				return nil, err
			}

			conf.GCP.GCPKeyData = inputConf.GCPCredentials
			conf.GCP.GCPRegion = inputConf.GCPRegion
			conf.GCP.GCPProjectID = inputConf.GCPProjectID
		} else {
			inputConf := &input.GCR{
				GCPCredentials: conf.GCP.GCPKeyData,
				GCPRegion:      conf.GCP.GCPRegion,
				GCPProjectID:   conf.GCP.GCPProjectID,
			}

			lastApplied, err := inputConf.GetInput()

			if err != nil {
				return nil, err
			}

			conf.LastApplied = lastApplied
		}

		env = conf.GCP.AttachGCPEnv(env)
	case GKE:
		args = []string{operation, "gke"}

		if len(conf.LastApplied) > 0 {
			inputConf, err := input.GetGKEInput(conf.LastApplied)

			if err != nil {
				return nil, err
			}

			conf.GCP.GCPKeyData = inputConf.GCPCredentials
			conf.GCP.GCPRegion = inputConf.GCPRegion
			conf.GCP.GCPProjectID = inputConf.GCPProjectID
			conf.GKE.ClusterName = inputConf.ClusterName
		} else {
			inputConf := &input.GKE{
				GCPCredentials: conf.GCP.GCPKeyData,
				GCPRegion:      conf.GCP.GCPRegion,
				GCPProjectID:   conf.GCP.GCPProjectID,
				ClusterName:    conf.GKE.ClusterName,
			}

			lastApplied, err := inputConf.GetInput()

			if err != nil {
				return nil, err
			}

			conf.LastApplied = lastApplied
		}

		env = conf.GCP.AttachGCPEnv(env)
		env = conf.GKE.AttachGKEEnv(env)
	case DOCR:
		args = []string{operation, "docr"}

		if len(conf.LastApplied) > 0 {
			inputConf, err := input.GetDOCRInput(conf.LastApplied)

			if err != nil {
				return nil, err
			}

			conf.DO.DOToken = inputConf.DOToken
			conf.DOCR.DOCRSubscriptionTier = inputConf.DOCRSubscriptionTier
			conf.DOCR.DOCRName = inputConf.DOCRName
		} else {
			inputConf := &input.DOCR{
				DOToken:              conf.DO.DOToken,
				DOCRSubscriptionTier: conf.DOCR.DOCRSubscriptionTier,
				DOCRName:             conf.DOCR.DOCRName,
			}

			lastApplied, err := inputConf.GetInput()

			if err != nil {
				return nil, err
			}

			conf.LastApplied = lastApplied
		}

		env = conf.DO.AttachDOEnv(env)
		env = conf.DOCR.AttachDOCREnv(env)
	case DOKS:
		args = []string{operation, "doks"}

		if len(conf.LastApplied) > 0 {
			inputConf, err := input.GetDOKSInput(conf.LastApplied)

			if err != nil {
				return nil, err
			}

			conf.DO.DOToken = inputConf.DOToken
			conf.DOKS.DORegion = inputConf.DORegion
			conf.DOKS.DOKSClusterName = inputConf.ClusterName
		} else {
			inputConf := &input.DOKS{
				DOToken:     conf.DO.DOToken,
				DORegion:    conf.DOKS.DORegion,
				ClusterName: conf.DOKS.DOKSClusterName,
			}

			lastApplied, err := inputConf.GetInput()

			if err != nil {
				return nil, err
			}

			conf.LastApplied = lastApplied
		}

		env = conf.DO.AttachDOEnv(env)
		env = conf.DOKS.AttachDOKSEnv(env)
	}

	imagePullSecrets := []v1.LocalObjectReference{}

	if conf.ImagePullSecret != "" {
		imagePullSecrets = append(imagePullSecrets, v1.LocalObjectReference{
			Name: conf.ImagePullSecret,
		})
	}

	return &batchv1.Job{
		ObjectMeta: metav1.ObjectMeta{
			Name:      conf.Name,
			Namespace: conf.Namespace,
			Labels:    labels,
		},
		Spec: batchv1.JobSpec{
			TTLSecondsAfterFinished: &ttl,
			BackoffLimit:            &backoffLimit,
			Template: v1.PodTemplateSpec{
				ObjectMeta: metav1.ObjectMeta{
					Labels: labels,
				},
				Spec: v1.PodSpec{
					RestartPolicy:    v1.RestartPolicyNever,
					ImagePullSecrets: imagePullSecrets,
					Containers: []v1.Container{
						{
							Name:            "provisioner",
							Image:           "gcr.io/porter-dev-273614/provisioner:" + conf.ProvisionerImageTag,
							ImagePullPolicy: v1.PullAlways,
							Args:            args,
							Env:             env,
						},
					},
				},
			},
		},
	}, nil
}

// GetRedisStreamID returns the stream id that should be used
func (conf *Conf) GetRedisStreamID() string {
	return conf.ID
}

// GetTFWorkspaceID returns the workspace id that should be used
func (conf *Conf) GetTFWorkspaceID() string {
	return conf.ID
}

// attaches the env variables required by all provisioner instances
func (conf *Conf) attachDefaultEnv(env []v1.EnvVar) []v1.EnvVar {
	env = conf.addRedisEnv(env)
	env = conf.addPostgresEnv(env)
	env = conf.addTFEnv(env)

	return env
}

// adds the env variables required for the Redis stream
func (conf *Conf) addRedisEnv(env []v1.EnvVar) []v1.EnvVar {
	env = append(env, v1.EnvVar{
		Name:  "REDIS_ENABLED",
		Value: "true",
	})

	env = append(env, v1.EnvVar{
		Name:  "REDIS_HOST",
		Value: conf.Redis.Host,
	})

	env = append(env, v1.EnvVar{
		Name:  "REDIS_PORT",
		Value: conf.Redis.Port,
	})

	env = append(env, v1.EnvVar{
		Name:  "REDIS_USER",
		Value: conf.Redis.Username,
	})

	env = append(env, v1.EnvVar{
		Name:  "REDIS_PASS",
		Value: conf.Redis.Password,
		// ValueFrom: &v1.EnvVarSource{
		// 	SecretKeyRef: &v1.SecretKeySelector{
		// 		LocalObjectReference: v1.LocalObjectReference{
		// 			Name: "redis",
		// 		},
		// 		Key: "redis-password",
		// 	},
		// },
	})

	env = append(env, v1.EnvVar{
		Name:  "REDIS_STREAM_ID",
		Value: conf.GetRedisStreamID(),
	})

	return env
}

// adds the env variables required for the PG backend
func (conf *Conf) addPostgresEnv(env []v1.EnvVar) []v1.EnvVar {
	env = append(env, v1.EnvVar{
		Name:  "PG_HOST",
		Value: conf.Postgres.Host,
	})

	env = append(env, v1.EnvVar{
		Name:  "PG_PORT",
		Value: fmt.Sprintf("%d", conf.Postgres.Port),
	})

	env = append(env, v1.EnvVar{
		Name:  "PG_USER",
		Value: conf.Postgres.Username,
	})

	env = append(env, v1.EnvVar{
		Name:  "PG_PASS",
		Value: conf.Postgres.Password,
	})

	return env
}

func (conf *Conf) addTFEnv(env []v1.EnvVar) []v1.EnvVar {
	env = append(env, v1.EnvVar{
		Name:  "TF_DIR",
		Value: "./terraform",
	})

	env = append(env, v1.EnvVar{
		Name:  "TF_PORTER_BACKEND",
		Value: "postgres",
	})

	env = append(env, v1.EnvVar{
		Name:  "TF_PORTER_WORKSPACE",
		Value: conf.GetTFWorkspaceID(),
	})

	return env
}
