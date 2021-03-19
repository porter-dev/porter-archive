package domain

import (
	"context"
	"fmt"
	"math/rand"
	"net"
	"strings"

	"github.com/porter-dev/porter/internal/models"
	v1 "k8s.io/api/core/v1"
	"k8s.io/api/extensions/v1beta1"
	"k8s.io/client-go/kubernetes"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/util/intstr"
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
		return "", false, nil
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
	const allowed = "123456789abcdefghijklmnopqrstuvwxyz"
	suffix := make([]byte, 8)
	for i := range suffix {
		suffix[i] = allowed[rand.Intn(len(allowed))]
	}

	subdomain := fmt.Sprintf("%s-%s", c.ReleaseName, string(suffix))

	return &models.DNSRecord{
		SubdomainPrefix: subdomain,
		RootDomain:      c.RootDomain,
		Endpoint:        c.Endpoint,
		Hostname:        fmt.Sprintf("%s.%s", subdomain, c.RootDomain),
	}
}

func (e *DNSRecord) CreateDomain(clientset kubernetes.Interface) error {
	// determine if IP address or domain
	err := e.createIngress(clientset)

	if err != nil {
		return err
	}

	return e.createServiceWithEndpoint(clientset)
}

func (e *DNSRecord) createIngress(clientset kubernetes.Interface) error {
	_, err := clientset.ExtensionsV1beta1().Ingresses("default").Create(
		context.TODO(),
		&v1beta1.Ingress{
			ObjectMeta: metav1.ObjectMeta{
				Annotations: map[string]string{
					"kubernetes.io/ingress.class":                  "nginx",
					"nginx.ingress.kubernetes.io/ssl-redirect":     "true",
					"nginx.ingress.kubernetes.io/backend-protocol": "HTTPS",
					"nginx.ingress.kubernetes.io/upstream-vhost":   e.Hostname,
				},
				Name:      e.SubdomainPrefix,
				Namespace: "default",
			},
			Spec: v1beta1.IngressSpec{
				TLS: []v1beta1.IngressTLS{
					{
						Hosts:      []string{fmt.Sprintf("%s.%s", e.SubdomainPrefix, e.RootDomain)},
						SecretName: "wildcard-cert-tls",
					},
				},
				Rules: []v1beta1.IngressRule{
					{
						Host: fmt.Sprintf("%s.%s", e.SubdomainPrefix, e.RootDomain),
						IngressRuleValue: v1beta1.IngressRuleValue{
							HTTP: &v1beta1.HTTPIngressRuleValue{
								Paths: []v1beta1.HTTPIngressPath{
									{
										Backend: v1beta1.IngressBackend{
											ServiceName: e.SubdomainPrefix,
											ServicePort: intstr.IntOrString{
												Type:   intstr.Int,
												IntVal: 443,
											},
										},
									},
								},
							},
						},
					},
				},
			},
		},
		metav1.CreateOptions{},
	)

	return err
}

func (e *DNSRecord) createServiceWithEndpoint(clientset kubernetes.Interface) error {
	// determine if endpoint needs to be created or external name is ok
	isIPv4 := net.ParseIP(e.Endpoint) != nil

	svcSpec := v1.ServiceSpec{
		Ports: []v1.ServicePort{
			{
				Port: 80,
				TargetPort: intstr.IntOrString{
					Type:   intstr.Int,
					IntVal: 80,
				},
				Name: "http",
			},
			{
				Port: 443,
				TargetPort: intstr.IntOrString{
					Type:   intstr.Int,
					IntVal: 443,
				},
				Name: "https",
			},
		},
	}

	// case service spec on ipv4
	if isIPv4 {
		svcSpec.ClusterIP = "None"
	} else {
		svcSpec.Type = "ExternalName"
		svcSpec.ExternalName = e.Endpoint
	}

	// create service
	_, err := clientset.CoreV1().Services("default").Create(
		context.TODO(),
		&v1.Service{
			ObjectMeta: metav1.ObjectMeta{
				Name:      e.SubdomainPrefix,
				Namespace: "default",
			},
			Spec: svcSpec,
		},
		metav1.CreateOptions{},
	)

	if err != nil {
		return err
	}

	if isIPv4 {
		_, err = clientset.CoreV1().Endpoints("default").Create(
			context.TODO(),
			&v1.Endpoints{
				ObjectMeta: metav1.ObjectMeta{
					Name:      e.SubdomainPrefix,
					Namespace: "default",
				},
				Subsets: []v1.EndpointSubset{
					{
						Addresses: []v1.EndpointAddress{
							{
								IP: e.Endpoint,
							},
						},
						Ports: []v1.EndpointPort{
							{
								Name: "http",
								Port: 80,
							},
							{
								Name: "https",
								Port: 443,
							},
						},
					},
				},
			},
			metav1.CreateOptions{},
		)
	}

	return err
}
