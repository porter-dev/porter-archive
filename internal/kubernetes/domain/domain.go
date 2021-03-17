package domain

import (
	"context"
	"fmt"
	"net"

	v1 "k8s.io/api/core/v1"
	"k8s.io/api/extensions/v1beta1"
	"k8s.io/client-go/kubernetes"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/util/intstr"
)

type PorterEndpoint struct {
	SubdomainPrefix string
	RootDomain      string

	Endpoint string
	Hostname string
}

func (e *PorterEndpoint) CreateDomain(clientset kubernetes.Interface) error {
	// determine if IP address or domain
	err := e.createIngress(clientset)

	if err != nil {
		return err
	}

	return e.createServiceWithEndpoint(clientset)
}

func (e *PorterEndpoint) createIngress(clientset kubernetes.Interface) error {
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
				Rules: []v1beta1.IngressRule{
					v1beta1.IngressRule{
						Host: fmt.Sprintf("%s.%s", e.SubdomainPrefix, e.RootDomain),
						IngressRuleValue: v1beta1.IngressRuleValue{
							HTTP: &v1beta1.HTTPIngressRuleValue{
								Paths: []v1beta1.HTTPIngressPath{
									v1beta1.HTTPIngressPath{
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

func (e *PorterEndpoint) createServiceWithEndpoint(clientset kubernetes.Interface) error {
	// determine if endpoint needs to be created or external name is ok
	isIPv4 := net.ParseIP(e.Endpoint) != nil

	svcSpec := v1.ServiceSpec{
		Ports: []v1.ServicePort{
			v1.ServicePort{
				Port: 80,
				TargetPort: intstr.IntOrString{
					Type:   intstr.Int,
					IntVal: 80,
				},
				Name: "http",
			},
			v1.ServicePort{
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
					v1.EndpointSubset{
						Addresses: []v1.EndpointAddress{
							v1.EndpointAddress{
								IP: e.Endpoint,
							},
						},
						Ports: []v1.EndpointPort{
							v1.EndpointPort{
								Name: "http",
								Port: 80,
							},
							v1.EndpointPort{
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
