package types

type CreateRDSInfraRequest struct {
	// version of the postgres engine
	DBEngineVersion string `json:"db_engine_version"`

	// db type - postgres / mysql
	DBFamily string `json:"db_family"`

	// db instance credentials specifications
	DBName   string `json:"db_name"`
	Username string `json:"username"`
	Password string `json:"password"`

	MachineType  string `json:"machine_type"`
	DBStorage    string `json:"db_allocated_storage"`
	DBMaxStorage string `json:"db_max_allocated_storage"`
	DBEncryption bool   `json:"db_storage_encrypted"`
}
