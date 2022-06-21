package types

type AWSClusterIP struct {
	AvailabilityZone        string `json:"availability_zone"`
	AvailableIPAddressCount int64  `json:"available_ip_address_count"`
}

type ListAWSClusterIPsResponse []*AWSClusterIP
