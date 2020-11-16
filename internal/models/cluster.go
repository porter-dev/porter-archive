package models

import "gorm.io/gorm"

// Cluster type that extends gorm.Model
type Cluster struct {
	gorm.Model

	Name                  string `json:"name"`
	ServiceAccountID      uint   `json:"service_account_id"`
	LocationOfOrigin      string `json:"location_of_origin"`
	Server                string `json:"server"`
	TLSServerName         string `json:"tls-server-name,omitempty"`
	InsecureSkipTLSVerify bool   `json:"insecure-skip-tls-verify,omitempty"`
	ProxyURL              string `json:"proxy-url,omitempty"`

	// CertificateAuthorityData is encrypted at rest
	CertificateAuthorityData []byte `json:"certificate-authority-data,omitempty"`
}

// ClusterExternal is the external cluster type to be sent over REST
type ClusterExternal struct {
	ID                    uint   `json:"id"`
	ServiceAccountID      uint   `json:"service_account_id"`
	Name                  string `json:"name"`
	Server                string `json:"server"`
	TLSServerName         string `json:"tls-server-name,omitempty"`
	InsecureSkipTLSVerify bool   `json:"insecure-skip-tls-verify,omitempty"`
	ProxyURL              string `json:"proxy-url,omitempty"`
}

// Externalize generates an external Cluster to be shared over REST
func (c *Cluster) Externalize() *ClusterExternal {
	return &ClusterExternal{
		ID:                    c.Model.ID,
		ServiceAccountID:      c.ServiceAccountID,
		Name:                  c.Name,
		Server:                c.Server,
		TLSServerName:         c.TLSServerName,
		InsecureSkipTLSVerify: c.InsecureSkipTLSVerify,
		ProxyURL:              c.ProxyURL,
	}
}
