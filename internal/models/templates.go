package models

// IndexYAML represents a chart repo's index.yaml
type IndexYAML struct {
	APIVersion string                    `yaml:"apiVersion"`
	Generated  string                    `yaml:"generated"`
	Entries    map[interface{}]ChartYAML `yaml:"entries"`
}

// ChartYAML represents the data for chart in index.yaml
type ChartYAML []struct {
	APIVersion  string   `yaml:"apiVersion"`
	AppVersion  string   `yaml:"appVersion"`
	Created     string   `yaml:"created"`
	Description string   `yaml:"description"`
	Digest      string   `yaml:"digest"`
	Icon        string   `yaml:"icon"`
	Name        string   `yaml:"name"`
	Type        string   `yaml:"type"`
	Urls        []string `yaml:"urls"`
	Version     string   `yaml:"version"`
}

// PorterChart represents a bundled Porter template
type PorterChart struct {
	Name        string
	Description string
	Icon        string
	Form        FormYAML
	Markdown    string
}

// FormYAML represents a chart's values.yaml form abstraction
type FormYAML struct {
	Name        string   `yaml:"name"`
	Icon        string   `yaml:"icon"`
	Description string   `yaml:"description"`
	Tags        []string `yaml:"tags"`
	Tabs        []struct {
		Name     string `yaml:"name"`
		Label    string `yaml:"label"`
		Sections []struct {
			Name     string `yaml:"name"`
			ShowIf   string `yaml:"show_if"`
			Contents []struct {
				Type     string `yaml:"type"`
				Label    string `yaml:"label"`
				Name     string `yaml:"name,omitempty"`
				Variable string `yaml:"variable,omitempty"`
				Settings struct {
					Default interface{}
				} `yaml:"settings,omitempty"`
			} `yaml:"contents"`
		} `yaml:"sections"`
	} `yaml:"tabs"`
}