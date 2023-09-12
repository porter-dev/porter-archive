package porter_app

import (
	"context"

	"github.com/porter-dev/porter/internal/integrations/dns"
	"github.com/porter-dev/porter/internal/kubernetes"
	"github.com/porter-dev/porter/internal/kubernetes/domain"
	"github.com/porter-dev/porter/internal/repository"
	"github.com/porter-dev/porter/internal/telemetry"
)

// CreatePorterSubdomainInput is the input to the CreatePorterSubdomain function
type CreatePorterSubdomainInput struct {
	AppName             string
	RootDomain          string
	KubernetesAgent     *kubernetes.Agent
	DNSClient           *dns.Client
	DNSRecordRepository repository.DNSRecordRepository
}

// CreatePorterSubdomain creates a subdomain for the porter app
func CreatePorterSubdomain(ctx context.Context, input CreatePorterSubdomainInput) (string, error) {
	ctx, span := telemetry.NewSpan(ctx, "create-porter-subdomain")
	defer span.End()

	var createdDomain string

	if input.KubernetesAgent == nil {
		return "", telemetry.Error(ctx, span, nil, "k8s agent is nil")
	}
	if input.DNSClient == nil {
		return "", telemetry.Error(ctx, span, nil, "powerdns client is nil")
	}
	if input.AppName == "" {
		return "", telemetry.Error(ctx, span, nil, "app name is empty")
	}
	if input.RootDomain == "" {
		return "", telemetry.Error(ctx, span, nil, "root domain is empty")
	}

	endpoint, found, err := domain.GetNGINXIngressServiceIP(input.KubernetesAgent.Clientset)
	if err != nil {
		return createdDomain, telemetry.Error(ctx, span, err, "error getting nginx ingress service ip")
	}
	if !found {
		return createdDomain, telemetry.Error(ctx, span, nil, "target cluster does not have nginx ingress")
	}

	createDomainConf := domain.CreateDNSRecordConfig{
		ReleaseName: input.AppName,
		RootDomain:  input.RootDomain,
		Endpoint:    endpoint,
	}

	record := createDomainConf.NewDNSRecordForEndpoint()

	record, err = input.DNSRecordRepository.CreateDNSRecord(record)

	if err != nil {
		return createdDomain, telemetry.Error(ctx, span, nil, "error creating dns record")
	}
	if record == nil {
		return createdDomain, telemetry.Error(ctx, span, nil, "dns record is nil")
	}

	_record := domain.DNSRecord(*record)

	err = _record.CreateDomain(input.DNSClient)
	if err != nil {
		return createdDomain, telemetry.Error(ctx, span, err, "error creating domain")
	}

	createdDomain = _record.Hostname

	return createdDomain, nil
}
