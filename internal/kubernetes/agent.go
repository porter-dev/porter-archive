package kubernetes

import (
	"context"

	v1 "k8s.io/api/core/v1"
	v1Machinery "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
)

// ListNamespaces simply lists namespaces
func ListNamespaces(clientset *kubernetes.Clientset) *v1.NamespaceList {
	namespaces, _ := clientset.CoreV1().Namespaces().List(
		context.TODO(),
		v1Machinery.ListOptions{},
	)

	return namespaces
}
