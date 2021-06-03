package nodes

import (
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
)

func getPodsTotalRequestsAndLimits(podList *corev1.PodList) (reqs map[corev1.ResourceName]resource.Quantity, limits map[corev1.ResourceName]resource.Quantity) {
	reqs, limits = map[corev1.ResourceName]resource.Quantity{}, map[corev1.ResourceName]resource.Quantity{}
	for _, pod := range podList.Items {
		podReqs, podLimits := PodRequestsAndLimits(&pod)
		for podReqName, podReqValue := range podReqs {
			if value, ok := reqs[podReqName]; !ok {
				reqs[podReqName] = podReqValue.DeepCopy()
			} else {
				value.Add(podReqValue)
				reqs[podReqName] = value
			}
		}
		for podLimitName, podLimitValue := range podLimits {
			if value, ok := limits[podLimitName]; !ok {
				limits[podLimitName] = podLimitValue.DeepCopy()
			} else {
				value.Add(podLimitValue)
				limits[podLimitName] = value
			}
		}
	}
	return
}

func PodRequestsAndLimits(pod *corev1.Pod) (reqs, limits corev1.ResourceList) {
	reqs, limits = corev1.ResourceList{}, corev1.ResourceList{}
	for _, container := range pod.Spec.Containers {
		addResourceList(reqs, container.Resources.Requests)
		addResourceList(limits, container.Resources.Limits)
	}
	// init containers define the minimum of any resource
	for _, container := range pod.Spec.InitContainers {
		maxResourceList(reqs, container.Resources.Requests)
		maxResourceList(limits, container.Resources.Limits)
	}

	// Add overhead for running a pod to the sum of requests and to non-zero limits:
	if pod.Spec.Overhead != nil {
		addResourceList(reqs, pod.Spec.Overhead)

		for name, quantity := range pod.Spec.Overhead {
			if value, ok := limits[name]; ok && !value.IsZero() {
				value.Add(quantity)
				limits[name] = value
			}
		}
	}
	return
}

// addResourceList adds the resources in newList to list
func addResourceList(list, new corev1.ResourceList) {
	for name, quantity := range new {
		if value, ok := list[name]; !ok {
			list[name] = quantity.DeepCopy()
		} else {
			value.Add(quantity)
			list[name] = value
		}
	}
}

// maxResourceList sets list to the greater of list/newList for every resource
// either list
func maxResourceList(list, new corev1.ResourceList) {
	for name, quantity := range new {
		if value, ok := list[name]; !ok {
			list[name] = quantity.DeepCopy()
			continue
		} else {
			if quantity.Cmp(value) > 0 {
				list[name] = quantity.DeepCopy()
			}
		}
	}
}

// func IsHugePageResourceName(name corev1.ResourceName) bool {
// 	return strings.HasPrefix(string(name), corev1.ResourceHugePagesPrefix)
// }

// var standardContainerResources = sets.NewString(
// 	string(corev1.ResourceCPU),
// 	string(corev1.ResourceMemory),
// 	string(corev1.ResourceEphemeralStorage),
// )

// func IsStandardContainerResourceName(str string) bool {
// 	return standardContainerResources.Has(str) || IsHugePageResourceName(corev1.ResourceName(str))
// }

func DescribeNodeResource(nodeNonTerminatedPodsList *corev1.PodList, node *corev1.Node) *NodeUsage {
	allocatable := node.Status.Capacity
	if len(node.Status.Allocatable) > 0 {
		allocatable = node.Status.Allocatable
	}

	reqs, limits := getPodsTotalRequestsAndLimits(nodeNonTerminatedPodsList)
	cpuReqs, cpuLimits, memoryReqs, memoryLimits, ephemeralstorageReqs, ephemeralstorageLimits :=
		reqs[corev1.ResourceCPU], limits[corev1.ResourceCPU], reqs[corev1.ResourceMemory], limits[corev1.ResourceMemory], reqs[corev1.ResourceEphemeralStorage], limits[corev1.ResourceEphemeralStorage]
	fractionCpuReqs := float64(0)
	fractionCpuLimits := float64(0)
	if allocatable.Cpu().MilliValue() != 0 {
		fractionCpuReqs = float64(cpuReqs.MilliValue()) / float64(allocatable.Cpu().MilliValue()) * 100
		fractionCpuLimits = float64(cpuLimits.MilliValue()) / float64(allocatable.Cpu().MilliValue()) * 100
	}
	fractionMemoryReqs := float64(0)
	fractionMemoryLimits := float64(0)
	if allocatable.Memory().Value() != 0 {
		fractionMemoryReqs = float64(memoryReqs.Value()) / float64(allocatable.Memory().Value()) * 100
		fractionMemoryLimits = float64(memoryLimits.Value()) / float64(allocatable.Memory().Value()) * 100
	}
	fractionEphemeralStorageReqs := float64(0)
	fractionEphemeralStorageLimits := float64(0)
	if allocatable.StorageEphemeral().Value() != 0 {
		fractionEphemeralStorageReqs = float64(ephemeralstorageReqs.Value()) / float64(allocatable.StorageEphemeral().Value()) * 100
		fractionEphemeralStorageLimits = float64(ephemeralstorageLimits.Value()) / float64(allocatable.StorageEphemeral().Value()) * 100
	}

	// extResources := make([]string, 0, len(allocatable))
	// hugePageResources := make([]string, 0, len(allocatable))
	// for resource := range allocatable {
	// 	if IsHugePageResourceName(resource) {
	// 		hugePageResources = append(hugePageResources, string(resource))
	// 	} else if !IsStandardContainerResourceName(string(resource)) && resource != corev1.ResourcePods {
	// 		extResources = append(extResources, string(resource))
	// 	}
	// }

	// sort.Strings(extResources)
	// sort.Strings(hugePageResources)

	// for _, resource := range hugePageResources {
	// 	hugePageSizeRequests, hugePageSizeLimits, hugePageSizeAllocable := reqs[corev1.ResourceName(resource)], limits[corev1.ResourceName(resource)], allocatable[corev1.ResourceName(resource)]
	// 	fractionHugePageSizeRequests := float64(0)
	// 	fractionHugePageSizeLimits := float64(0)
	// 	if hugePageSizeAllocable.Value() != 0 {
	// 		fractionHugePageSizeRequests = float64(hugePageSizeRequests.Value()) / float64(hugePageSizeAllocable.Value()) * 100
	// 		fractionHugePageSizeLimits = float64(hugePageSizeLimits.Value()) / float64(hugePageSizeAllocable.Value()) * 100
	// 	}

	// }

	return &NodeUsage{
		fractionCpuReqs,
		fractionCpuLimits,
		fractionMemoryReqs,
		fractionMemoryLimits,
		fractionEphemeralStorageReqs,
		fractionEphemeralStorageLimits,
	}
}
