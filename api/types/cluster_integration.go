package types

type AWSSubnet struct {
	AvailabilityZone        string `json:"availability_zone"`
	AvailableIPAddressCount int64  `json:"available_ip_address_count"`
}

type GetAWSClusterInfoResponse struct {
	Name       string       `json:"name"`
	K8sVersion string       `json:"kubernetes_server_version"`
	EKSVersion string       `json:"eks_version"`
	Subnets    []*AWSSubnet `json:"subnets"`
}
