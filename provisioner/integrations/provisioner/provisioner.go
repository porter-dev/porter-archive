package provisioner

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"

	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/provisioner/server/config"
	batchv1 "k8s.io/api/batch/v1"
	v1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
)

type ProvisionerOperation string

const (
	Apply   ProvisionerOperation = "apply"
	Destroy ProvisionerOperation = "destroy"
)

type ProvisionCredentialExchange struct {
	CredExchangeEndpoint string
	CredExchangeToken    string
	CredExchangeID       uint

	VaultToken string
}

type ProvisionOpts struct {
	Infra              *models.Infra
	Config             *config.Config
	CredentialExchange *ProvisionCredentialExchange
	OperationKind      ProvisionerOperation
	Kind               string
	Values             map[string]interface{}
}

func Provision(opts *ProvisionOpts, k8sClient kubernetes.Interface) error {
	pc := opts.Config.ProvisionerConf
	// get the provisioner job template
	job, err := getProvisionerJobTemplate(opts)

	if err != nil {
		return err
	}

	_, err = k8sClient.BatchV1().Jobs(pc.ProvisionerJobNamespace).Create(
		context.Background(),
		job,
		metav1.CreateOptions{},
	)

	return err
}

func getProvisionerJobTemplate(opts *ProvisionOpts) (*batchv1.Job, error) {
	pc := opts.Config.ProvisionerConf

	labels := map[string]string{
		"app": "provisioner",
	}

	ttl := int32(3600)

	backoffLimit := int32(1)

	imagePullSecrets := []v1.LocalObjectReference{}

	if pc.ProvisionerImagePullSecret != "" {
		imagePullSecrets = append(imagePullSecrets, v1.LocalObjectReference{
			Name: pc.ProvisionerImagePullSecret,
		})
	}

	env, err := getTFEnv(opts)

	if err != nil {
		return nil, err
	}

	job := &batchv1.Job{
		ObjectMeta: metav1.ObjectMeta{
			Name:      fmt.Sprintf("%s-%s", string(opts.OperationKind), opts.Infra.GetUniqueName()),
			Namespace: pc.ProvisionerJobNamespace,
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
							Image:           "gcr.io/porter-dev-273614/provisioner:" + pc.ProvisionerImageTag,
							ImagePullPolicy: v1.PullAlways,
							Args: []string{
								string(opts.OperationKind),
								string(opts.Infra.Kind),
							},
							Env: env,
						},
					},
				},
			},
		},
	}

	return job, nil
}

func getTFEnv(opts *ProvisionOpts) ([]v1.EnvVar, error) {
	pc := opts.Config.ProvisionerConf

	env := make([]v1.EnvVar, 0)

	env = append(env, v1.EnvVar{
		Name:  "TF_DIR",
		Value: "./terraform",
	})

	env = append(env, v1.EnvVar{
		Name:  "TF_ORG_ID",
		Value: opts.Infra.GetUniqueName(),
	})

	env = append(env, v1.EnvVar{
		Name:  "TF_BACKEND_URL",
		Value: pc.ProvisionerBackendURL,
	})

	env = append(env, v1.EnvVar{
		Name:  "CRED_EXCHANGE_ENDPOINT",
		Value: opts.CredentialExchange.CredExchangeEndpoint,
	})

	env = append(env, v1.EnvVar{
		Name:  "CRED_EXCHANGE_ID",
		Value: fmt.Sprintf("%d", opts.CredentialExchange.CredExchangeID),
	})

	env = append(env, v1.EnvVar{
		Name:  "CRED_EXCHANGE_TOKEN",
		Value: opts.CredentialExchange.CredExchangeToken,
	})

	env = append(env, v1.EnvVar{
		Name:  "VAULT_TOKEN",
		Value: opts.CredentialExchange.VaultToken,
	})

	// marshal the values to JSON and base-64 encode them
	valBytes, err := json.Marshal(opts.Values)

	if err != nil {
		return nil, err
	}

	env = append(env, v1.EnvVar{
		Name:  "TF_VALUES",
		Value: base64.StdEncoding.EncodeToString(valBytes),
	})

	env = append(env, v1.EnvVar{
		Name:  "TF_KIND",
		Value: opts.Kind,
	})

	return env, nil
}
