package domain

import (
	"context"
	"fmt"
	"net"
	"strings"

	"github.com/porter-dev/porter/internal/encryption"
	"github.com/porter-dev/porter/internal/integrations/powerdns"
	"github.com/porter-dev/porter/internal/models"
	v1 "k8s.io/api/core/v1"
	"k8s.io/client-go/kubernetes"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// GetNGINXIngressServiceIP retrieves the external address of the nginx-ingress service
func GetNGINXIngressServiceIP(clientset kubernetes.Interface) (string, bool, error) {
	svcList, err := clientset.CoreV1().Services("").List(context.TODO(), metav1.ListOptions{
		LabelSelector: "app.kubernetes.io/managed-by=Helm",
	})

	if err != nil {
		return "", false, err
	}

	var nginxSvc *v1.Service
	exists := false

	for _, svc := range svcList.Items {
		// check that helm chart annotation is correct exists
		if chartAnn, found := svc.ObjectMeta.Labels["helm.sh/chart"]; found {
			if (strings.Contains(chartAnn, "ingress-nginx") || strings.Contains(chartAnn, "nginx-ingress")) && svc.Spec.Type == v1.ServiceTypeLoadBalancer {
				nginxSvc = &svc
				exists = true
				break
			}
		}
	}

	if !exists {
		// look for alternate services/names (just Azure for now)
		svcList, err = clientset.CoreV1().Services("").List(context.TODO(), metav1.ListOptions{
			LabelSelector: "app=addon-http-application-routing-nginx-ingress",
		})

		if err != nil {
			return "", false, err
		}

		for _, svc := range svcList.Items {
			// check that the service is type load balancer
			if svc.Spec.Type == v1.ServiceTypeLoadBalancer {
				nginxSvc = &svc
				exists = true
				break
			}
		}

		if !exists {
			return "", false, nil
		}
	}

	if ipArr := nginxSvc.Status.LoadBalancer.Ingress; len(ipArr) > 0 {
		// first default to ip, then check hostname
		if ipArr[0].IP != "" {
			return ipArr[0].IP, true, nil
		} else if ipArr[0].Hostname != "" {
			return ipArr[0].Hostname, true, nil
		}
	}

	return "", false, nil
}

// DNSRecord wraps the gorm DNSRecord model
type DNSRecord models.DNSRecord

type CreateDNSRecordConfig struct {
	ReleaseName string
	RootDomain  string
	Endpoint    string
}

// NewDNSRecordForEndpoint generates a random subdomain and returns a DNSRecord
// model
func (c *CreateDNSRecordConfig) NewDNSRecordForEndpoint() *models.DNSRecord {
	suffix, _ := encryption.GenerateRandomBytes(8)

	subdomain := fmt.Sprintf("%s-%s", c.ReleaseName, suffix)

	return &models.DNSRecord{
		SubdomainPrefix: subdomain,
		RootDomain:      c.RootDomain,
		Endpoint:        c.Endpoint,
		Hostname:        fmt.Sprintf("%s.%s", subdomain, c.RootDomain),
	}
}

// CreateDomain creates a new record for the vanity domain
func (e *DNSRecord) CreateDomain(powerDNSClient *powerdns.Client) error {
	isIPv4 := net.ParseIP(e.Endpoint) != nil
	domain := fmt.Sprintf("%s.%s", e.SubdomainPrefix, e.RootDomain)

	if isIPv4 {
		return powerDNSClient.CreateARecord(e.Endpoint, domain)
	}

	return powerDNSClient.CreateCNAMERecord(e.Endpoint, domain)
}
