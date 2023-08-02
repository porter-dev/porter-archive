package types

type Revision struct {
	ID          uint   `json:"id"`
	Version     uint   `json:"version"`
	PorterAppID uint   `json:"porter_app_id"`
	PorterYAML  string `json:"porter_yaml"`
}