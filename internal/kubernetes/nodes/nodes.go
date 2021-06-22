package nodes

import (
	"context"
	"sync"

	v1 "k8s.io/api/core/v1"
	"k8s.io/client-go/kubernetes"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

type NodeUsage struct {
	fractionCpuReqs                float64
	fractionCpuLimits              float64
	fractionMemoryReqs             float64
	fractionMemoryLimits           float64
	fractionEphemeralStorageReqs   float64
	fractionEphemeralStorageLimits float64
}

type NodeWithUsageData struct {
	Name                           string             `json:"name"`
	FractionCpuReqs                float64            `json:"cpu_reqs"`
	FractionCpuLimits              float64            `json:"cpu_limits"`
	FractionMemoryReqs             float64            `json:"memory_reqs"`
	FractionMemoryLimits           float64            `json:"memory_limits"`
	FractionEphemeralStorageReqs   float64            `json:"ephemeral_storage_reqs"`
	FractionEphemeralStorageLimits float64            `json:"ephemeral_storage_limits"`
	Condition                      []v1.NodeCondition `json:"node_conditions"`
}

func (nu *NodeUsage) Externalize(node v1.Node) *NodeWithUsageData {
	return &NodeWithUsageData{
		Name:                           node.Name,
		FractionCpuReqs:                nu.fractionCpuReqs,
		FractionCpuLimits:              nu.fractionCpuLimits,
		FractionMemoryReqs:             nu.fractionMemoryReqs,
		FractionMemoryLimits:           nu.fractionMemoryLimits,
		FractionEphemeralStorageReqs:   nu.fractionEphemeralStorageReqs,
		FractionEphemeralStorageLimits: nu.fractionEphemeralStorageLimits,
		Condition:                      node.Status.Conditions,
	}
}

func GetNodesUsage(clientset kubernetes.Interface) []*NodeWithUsageData {
	nodeList, _ := clientset.CoreV1().Nodes().List(context.TODO(), metav1.ListOptions{})

	extNodeList := make([]*NodeWithUsageData, len(nodeList.Items))
	var wg sync.WaitGroup
	for i := range nodeList.Items {
		index := i
		currentNode := &nodeList.Items[index]
		wg.Add(1)
		go func() {
			defer wg.Done()
			podList := getPodsForNode(clientset, currentNode.Name)
			nodeUsage := DescribeNodeResource(podList, currentNode)

			extNodeList[index] = nodeUsage.Externalize(*currentNode)
		}()
	}
	wg.Wait()

	return extNodeList
}

func getPodsForNode(clientset kubernetes.Interface, nodeName string) *v1.PodList {
	podList, _ := clientset.CoreV1().Pods("").List(context.TODO(), metav1.ListOptions{
		FieldSelector: "spec.nodeName=" + nodeName + ",status.phase=Running",
	})

	return podList
}
