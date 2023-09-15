package dns

// RecordType strongly types dns record types
type RecordType int

const (
	// RecordType_A represents a DNS RecordType_A record
	RecordType_A RecordType = iota

	// RecordType_CNAME represents a DNS RecordType_CNAME record
	RecordType_CNAME
)

// WrappedClient is an interface describing a wrapper
// around a particular dns implementation
type WrappedClient interface {
	CreateARecord(record Record) error
	CreateCNAMERecord(record Record) error
}

// Client wraps the underlying powerdns client
// providing a stable api around interacting with DNS
type Client struct {
	Client WrappedClient
}

// Record describes a specific DNS record to create
// and can include implementation-specific attributes
type Record struct {
	Type       RecordType
	Name       string
	RootDomain string
	Value      string
}

// CreateRecord creates a new dns record
func (c Client) CreateRecord(record Record) error {
	if record.Type == RecordType_A {
		return c.Client.CreateARecord(record)
	}

	return c.Client.CreateCNAMERecord(record)
}
