package provisioner

import (
	"fmt"

	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/kubernetes/provisioner/aws/ecr"
	"github.com/porter-dev/porter/internal/kubernetes/provisioner/aws/eks"
	"github.com/porter-dev/porter/internal/kubernetes/provisioner/do/docr"
	"github.com/porter-dev/porter/internal/kubernetes/provisioner/do/doks"
	"github.com/porter-dev/porter/internal/kubernetes/provisioner/gcp/gke"
	"github.com/porter-dev/porter/internal/models"
	batchv1 "k8s.io/api/batch/v1"
	v1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
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
	DryRun              bool
	Infra               *models.Infra
	ProvImageTag        string
	ProvImagePullSecret string
	TFHTTPBackendURL    string
	CredentialExchange  *ProvisionCredentialExchange
	OperationKind       ProvisionerOperation

	// resource-specific opts
	ECR  *ecr.Conf
	EKS  *eks.Conf
	GKE  *gke.Conf
	DOCR *docr.Conf
	DOKS *doks.Conf
}

func GetProvisionerJobTemplate(opts *ProvisionOpts) (*batchv1.Job, error) {
	labels := map[string]string{
		"app": "provisioner",
	}

	ttl := int32(3600)

	backoffLimit := int32(1)

	imagePullSecrets := []v1.LocalObjectReference{}

	if opts.ProvImagePullSecret != "" {
		imagePullSecrets = append(imagePullSecrets, v1.LocalObjectReference{
			Name: opts.ProvImagePullSecret,
		})
	}

	env := GetTFEnv(opts)

	// add resource-specific env
	switch opts.Infra.Kind {
	case types.InfraECR:
		env = opts.ECR.AttachECREnv(env)
	case types.InfraEKS:
		env = opts.EKS.AttachEKSEnv(env)
	case types.InfraGKE:
		env = opts.GKE.AttachGKEEnv(env)
	case types.InfraDOCR:
		env = opts.DOCR.AttachDOCREnv(env)
	case types.InfraDOKS:
		env = opts.DOKS.AttachDOKSEnv(env)
	}

	return &batchv1.Job{
		ObjectMeta: metav1.ObjectMeta{
			Name:      opts.Infra.GetUniqueName(),
			Namespace: "default",
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
							Image:           "gcr.io/porter-dev-273614/provisioner:" + opts.ProvImageTag,
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
	}, nil
}

func GetTFEnv(opts *ProvisionOpts) []v1.EnvVar {
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
		Value: opts.TFHTTPBackendURL,
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

	return env
}
