package types

import "strings"

type CreateECRInfraRequest struct {
	ECRName          string `json:"ecr_name" form:"required"`
	ProjectID        uint   `json:"-" form:"required"`
	AWSIntegrationID uint   `json:"aws_integration_id" form:"required"`
}

type CreateEKSInfraRequest struct {
	EKSName          string `json:"eks_name" form:"required"`
	MachineType      string `json:"machine_type"`
	IssuerEmail      string `json:"issuer_email" form:"required"`
	ProjectID        uint   `json:"-" form:"required"`
	AWSIntegrationID uint   `json:"aws_integration_id" form:"required"`
}

type CreateGCRInfraRequest struct {
	ProjectID        uint `json:"-" form:"required"`
	GCPIntegrationID uint `json:"gcp_integration_id" form:"required"`
}

type CreateGKEInfraRequest struct {
	GKEName          string `json:"gke_name" form:"required"`
	GCPRegion        string `json:"gcp_region" form:"required"`
	IssuerEmail      string `json:"issuer_email" form:"required"`
	ProjectID        uint   `json:"-" form:"required"`
	GCPIntegrationID uint   `json:"gcp_integration_id" form:"required"`
}

type CreateDOCRInfraRequest struct {
	DOCRName             string `json:"docr_name" form:"required"`
	DOCRSubscriptionTier string `json:"docr_subscription_tier" form:"required"`
	ProjectID            uint   `json:"-" form:"required"`
	DOIntegrationID      uint   `json:"do_integration_id" form:"required"`
}

type CreateDOKSInfraRequest struct {
	DORegion        string `json:"do_region" form:"required"`
	IssuerEmail     string `json:"issuer_email" form:"required"`
	DOKSName        string `json:"doks_name" form:"required"`
	ProjectID       uint   `json:"-" form:"required"`
	DOIntegrationID uint   `json:"do_integration_id" form:"required"`
}

type CreateRDSInfraRequest struct {
	// version of the postgres engine
	DBEngineVersion string `json:"db_engine_version"`
	// db type - postgress / mysql
	DBFamily string `json:"db_family"`

	// Deprecated, use DBEngineVersion instead
	// PGVersion string `json:"pg_version"`

	// db instance credentials specifications
	DBName   string `json:"db_name"`
	Username string `json:"username"`
	Password string `json:"password"`

	MachineType  string `json:"machine_type"`
	DBStorage    string `json:"db_allocated_storage"`
	DBMaxStorage string `json:"db_max_allocated_storage"`
	DBEncryption bool   `json:"db_storage_encrypted"`
}

type RDSInfraLastApplied struct {
	*CreateRDSInfraRequest

	ClusterID uint   `json:"cluster_id"`
	Namespace string `json:"namespace"`

	AWSRegion            string
	DBMajorEngineVersion string
	DBStorageEncrypted   string
	DeletionProtection   string
	VPCID                string
	Subnet1              string
	Subnet2              string
	Subnet3              string
}

type Family string

type EngineVersion string

func (e EngineVersion) MajorVersion() string {
	semver := strings.Split(string(e), ".")

	return strings.Join(semver[:len(semver)-1], ".")
}

type EngineVersions []EngineVersion

func (e EngineVersions) VersionExists(version EngineVersion) bool {
	for _, v := range e {
		if version == v {
			return true
		}
	}

	return false
}

const (
	FamilyPG9   Family = "postgres9"
	FamilyPG10  Family = "postgres10"
	FamilyPG11  Family = "postgres11"
	FamilyPG12  Family = "postgres12"
	FamilyPG13  Family = "postgres13"
	FamilyMysql Family = "mysql"
)

var availablePG9Versions EngineVersions = EngineVersions{
	"9.6.1",
	"9.6.2",
	"9.6.3",
	"9.6.4",
	"9.6.5",
	"9.6.6",
	"9.6.7",
	"9.6.8",
	"9.6.9",
	"9.6.10",
	"9.6.11",
	"9.6.12",
	"9.6.13",
	"9.6.14",
	"9.6.15",
	"9.6.16",
	"9.6.17",
	"9.6.18",
	"9.6.19",
	"9.6.20",
	"9.6.21",
	"9.6.22",
	"9.6.23",
}

var availablePG10Versions EngineVersions = EngineVersions{
	"10.1",
	"10.2",
	"10.3",
	"10.4",
	"10.5",
	"10.6",
	"10.7",
	"10.8",
	"10.9",
	"10.10",
	"10.11",
	"10.12",
	"10.13",
	"10.14",
	"10.15",
	"10.16",
	"10.17",
	"10.18",
}

var availablePG11Versions EngineVersions = EngineVersions{
	"11.1",
	"11.2",
	"11.3",
	"11.4",
	"11.5",
	"11.6",
	"11.7",
	"11.8",
	"11.9",
	"11.10",
	"11.11",
	"11.12",
	"11.13",
}

var availablePG12Versions EngineVersions = EngineVersions{
	"12.2",
	"12.3",
	"12.4",
	"12.5",
	"12.6",
	"12.7",
	"12.8",
}

var availablePG13Versions EngineVersions = EngineVersions{
	"13.1",
	"13.2",
	"13.3",
	"13.4",
}

var DBVersionMapping = map[Family]EngineVersions{
	FamilyPG9:   availablePG9Versions,
	FamilyPG10:  availablePG10Versions,
	FamilyPG11:  availablePG11Versions,
	FamilyPG12:  availablePG12Versions,
	FamilyPG13:  availablePG13Versions,
	FamilyMysql: {},
}
