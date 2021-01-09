package provisioner

import (
	"fmt"

	batchv1 "k8s.io/api/batch/v1"
	v1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	"github.com/porter-dev/porter/internal/kubernetes/provisioner/aws"
	"github.com/porter-dev/porter/internal/kubernetes/provisioner/aws/ecr"
	"github.com/porter-dev/porter/internal/kubernetes/provisioner/aws/eks"

	"github.com/porter-dev/porter/internal/config"
)

// InfraOption is a type of infrastructure that can be provisioned
type InfraOption string

// The list of infra options
const (
	Test InfraOption = "test"
	ECR  InfraOption = "ecr"
	EKS  InfraOption = "eks"
)

// Conf is the config required to start a provisioner container
type Conf struct {
	Kind      InfraOption
	Name      string
	Namespace string
	ID        string
	Redis     *config.RedisConf
	Postgres  *config.DBConf
	Operation ProvisionerOperation

	// provider-specific configurations
	AWS *aws.Conf
	ECR *ecr.Conf
	EKS *eks.Conf
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
	backoffLimit := int32(3)

	labels := map[string]string{
		"app": "provisioner",
	}

	args := make([]string, 0)

	if conf.Kind == Test {
		args = []string{operation, "test", "hello"}
	} else if conf.Kind == ECR {
		args = []string{operation, "ecr"}
		env = conf.AWS.AttachAWSEnv(env)
		env = conf.ECR.AttachECREnv(env)
	} else if conf.Kind == EKS {
		args = []string{operation, "eks"}
		env = conf.AWS.AttachAWSEnv(env)
		env = conf.EKS.AttachEKSEnv(env)
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
					RestartPolicy: v1.RestartPolicyOnFailure,
					Containers: []v1.Container{
						{
							Name:  "provisioner",
							Image: "gcr.io/porter-dev-273614/provisioner:latest",
							Args:  args,
							Env:   env,
							VolumeMounts: []v1.VolumeMount{
								v1.VolumeMount{
									MountPath: "/.terraform/plugin-cache",
									Name:      "tf-cache",
									ReadOnly:  true,
								},
							},
						},
					},
					Volumes: []v1.Volume{
						v1.Volume{
							Name: "tf-cache",
							VolumeSource: v1.VolumeSource{
								PersistentVolumeClaim: &v1.PersistentVolumeClaimVolumeSource{
									ClaimName: "tf-cache-pvc",
									ReadOnly:  true,
								},
							},
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
		Name:  "TF_PLUGIN_CACHE_DIR",
		Value: "/.terraform/plugin-cache",
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
