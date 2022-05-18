package k8s

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"time"

	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/provisioner/integrations/provisioner"
	batchv1 "k8s.io/api/batch/v1"
	v1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
)

type KubernetesProvisioner struct {
	k8sClient kubernetes.Interface
	pc        *KubernetesProvisionerConfig
}

type KubernetesProvisionerConfig struct {
	ProvisionerImageRepo       string
	ProvisionerImageTag        string
	ProvisionerImagePullSecret string
	ProvisionerJobNamespace    string
	ProvisionerBackendURL      string
}

func NewKubernetesProvisioner(k8sClient kubernetes.Interface, pc *KubernetesProvisionerConfig) *KubernetesProvisioner {
	return &KubernetesProvisioner{k8sClient, pc}
}

func (k *KubernetesProvisioner) Provision(opts *provisioner.ProvisionOpts) error {
	// get the provisioner job template
	job, err := k.getProvisionerJobTemplate(opts)

	if err != nil {
		return err
	}

	_, err = k.k8sClient.BatchV1().Jobs(k.pc.ProvisionerJobNamespace).Create(
		context.Background(),
		job,
		metav1.CreateOptions{},
	)

	return err
}

func (k *KubernetesProvisioner) getProvisionerJobTemplate(opts *provisioner.ProvisionOpts) (*batchv1.Job, error) {
	labels := map[string]string{
		"app": "provisioner",
	}

	ttl := int32(3600)

	backoffLimit := int32(1)

	imagePullSecrets := []v1.LocalObjectReference{}

	if k.pc.ProvisionerImagePullSecret != "" {
		imagePullSecrets = append(imagePullSecrets, v1.LocalObjectReference{
			Name: k.pc.ProvisionerImagePullSecret,
		})
	}

	env, err := k.getTFEnv(opts)

	if err != nil {
		return nil, err
	}

	job := &batchv1.Job{
		ObjectMeta: metav1.ObjectMeta{
			Name:      fmt.Sprintf("%s-%s-%d", string(opts.OperationKind), opts.Infra.GetUniqueName(), time.Now().Unix()),
			Namespace: k.pc.ProvisionerJobNamespace,
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
							Image:           k.pc.ProvisionerImageRepo + ":" + k.pc.ProvisionerImageTag,
							ImagePullPolicy: v1.PullAlways,
							Args: []string{
								string(opts.OperationKind),
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

func (k *KubernetesProvisioner) getTFEnv(opts *provisioner.ProvisionOpts) ([]v1.EnvVar, error) {
	env := make([]v1.EnvVar, 0)

	env = append(env, v1.EnvVar{
		Name:  "TF_DIR",
		Value: "./terraform",
	})

	env = append(env, v1.EnvVar{
		Name:  "TF_ORG_ID",
		Value: models.GetWorkspaceID(opts.Infra, opts.Operation),
	})

	env = append(env, v1.EnvVar{
		Name:  "TF_BACKEND_URL",
		Value: k.pc.ProvisionerBackendURL,
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
