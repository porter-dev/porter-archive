package nodes

import (
	"context"
	"fmt"

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
	Name                           string  `json:"name"`
	FractionCpuReqs                float64 `json:"cpu_reqs"`
	FractionCpuLimits              float64 `json:"cpu_limits"`
	FractionMemoryReqs             float64 `json:"memory_reqs"`
	FractionMemoryLimits           float64 `json:"memory_limits"`
	FractionEphemeralStorageReqs   float64 `json:"ephemeral_storage_reqs"`
	FractionEphemeralStorageLimits float64 `json:"ephemeral_storage_limits"`
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
	}
}

func GetNodesUsage(clientset kubernetes.Interface) []*NodeWithUsageData {
	nodeList, _ := clientset.CoreV1().Nodes().List(context.TODO(), metav1.ListOptions{})

	extNodeList := make([]*NodeWithUsageData, len(nodeList.Items))
	for index, currentNode := range nodeList.Items {
		podList := getPodsForNode(clientset, currentNode.Name)
		nodeUsage := DescribeNodeResource(podList, &currentNode)

		extNodeList[index] = nodeUsage.Externalize(currentNode)
	}

	return extNodeList
}

// func GetNodesUsage(clientset kubernetes.Interface) []*NodeWithUsageData {
// 	nodeList, _ := clientset.CoreV1().Nodes().List(context.TODO(), metav1.ListOptions{})

// 	extNodeList := make([]*NodeWithUsageData, len(nodeList.Items))
// 	var wg sync.WaitGroup
// 	for i, node := range nodeList.Items {
// 		wg.Add(1)
// 		go func(index int, currentNode *v1.Node) {
// 			defer wg.Done()
// 			podList := getPodsForNode(clientset, currentNode.Name)
// 			nodeUsage := DescribeNodeResource(podList, currentNode)

// 			extNodeList[index] = nodeUsage.Externalize(*currentNode)
// 		}(i, &node)
// 	}
// 	wg.Wait()

// 	return extNodeList
// }

// func GetNodesUsage(clientset kubernetes.Interface) []NodeWithUsageData {
// 	nodeList, _ := clientset.CoreV1().Nodes().List(context.TODO(), metav1.ListOptions{})

// 	nodeChan := make(chan NodeWithUsageData, len(nodeList.Items))

// 	for _, node := range nodeList.Items {
// 		go func(currentNode v1.Node, nc chan<- NodeWithUsageData) {
// 			podList := getPodsForNode(clientset, currentNode.Name)
// 			nodeUsage := DescribeNodeResource(podList, &currentNode)
// 			nodeChan <- *nodeUsage.Externalize(currentNode)
// 		}(node, nodeChan)
// 	}

// 	extNodeList := make([]NodeWithUsageData, len(nodeList.Items))

// 	for i := 0; i < len(nodeList.Items); i++ {
// 		extNodeList[i] = <-nodeChan
// 	}

// 	return extNodeList
// }

func getPodsForNode(clientset kubernetes.Interface, nodeName string) *v1.PodList {
	fmt.Printf("%s", nodeName)

	podList, _ := clientset.CoreV1().Pods("").List(context.TODO(), metav1.ListOptions{
		FieldSelector: "spec.nodeName=" + nodeName + ",status.phase=Running",
	})

	return podList
}
