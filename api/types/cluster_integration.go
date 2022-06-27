package types

type AWSSubnet struct {
	SubnetID                string `json:"subnet_id"`
	AvailabilityZone        string `json:"availability_zone"`
	AvailableIPAddressCount int64  `json:"available_ip_address_count"`
}

type GetAWSClusterInfoResponse struct {
	Name       string       `json:"name"`
	ARN        string       `json:"arn"`
	K8sVersion string       `json:"kubernetes_server_version"`
	EKSVersion string       `json:"eks_version"`
	Status     string       `json:"status"`
	Subnets    []*AWSSubnet `json:"subnets"`
}
