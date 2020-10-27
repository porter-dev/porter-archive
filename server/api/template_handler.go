package api

import (
	"archive/tar"
	"bytes"
	"compress/gzip"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"io/ioutil"
	"net/http"
	"strings"

	"gopkg.in/yaml.v2"
)

var baseURL string = "https://porter-dev.github.io/chart-repo/"

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
}

// FormYAML represents a chart's values.yaml form abstraction
type FormYAML struct {
	Name        string   `yaml:"name"`
	Description string   `yaml:"description"`
	Tags        []string `yaml:"tags"`
	Sections    []struct {
		Name     string `yaml:"name"`
		Contents []struct {
			Type     string `yaml:"type"`
			Label    string `yaml:"label"`
			Name     string `yaml:"name,omitempty"`
			Variable string `yaml:"variable,omitempty"`
			Settings struct {
				Default int `yaml:"default"`
			} `yaml:"settings,omitempty"`
		} `yaml:"contents"`
	} `yaml:"sections"`
}

// HandleListTemplates retrieves a list of Porter templates
func (app *App) HandleListTemplates(w http.ResponseWriter, r *http.Request) {
	resp, err := http.Get(baseURL + "index.yaml")
	if err != nil {
		fmt.Println(err)
		return
	}

	defer resp.Body.Close()
	body, _ := ioutil.ReadAll(resp.Body)

	form := IndexYAML{}
	if err := yaml.Unmarshal([]byte(body), &form); err != nil {
		fmt.Println(err)
		return
	}

	// Loop over charts in index.yaml
	porterCharts := []PorterChart{}
	for k := range form.Entries {
		indexChart := form.Entries[k][0]
		tarURL := indexChart.Urls[0]
		if !strings.Contains(tarURL, "http://") {
			tarURL = baseURL + tarURL
		}

		formData, err := getFormData(tarURL)
		if err != nil {
			fmt.Println(err)
			return
		}

		porterChart := PorterChart{}
		porterChart.Name = indexChart.Name
		porterChart.Description = indexChart.Description
		porterChart.Icon = indexChart.Icon
		porterChart.Form = *formData

		porterCharts = append(porterCharts, porterChart)
	}

	json.NewEncoder(w).Encode(porterCharts)
}

func getFormData(tarURL string) (*FormYAML, error) {
	resp, err := http.Get(tarURL)
	if err != nil {
		fmt.Println(err)
		return nil, err
	}

	defer resp.Body.Close()
	body, _ := ioutil.ReadAll(resp.Body)
	buf := bytes.NewBuffer(body)

	gzf, err := gzip.NewReader(buf)
	if err != nil {
		fmt.Println(err)
		return nil, err
	}

	// Process tarball to generate FormYAML
	tarReader := tar.NewReader(gzf)
	for {
		header, err := tarReader.Next()
		if err == io.EOF {
			break
		} else if err != nil {
			fmt.Println(err)
			return nil, err
		}

		name := header.Name
		switch header.Typeflag {
		case tar.TypeDir:
			continue
		case tar.TypeReg:

			// Handle form.yaml located in archive
			if strings.Contains(name, "form.yaml") {
				bufForm := new(bytes.Buffer)

				_, err := io.Copy(bufForm, tarReader)
				if err != nil {
					fmt.Println(err)
					return nil, err
				}

				// Unmarshal yaml byte buffer
				form := FormYAML{}
				if err := yaml.Unmarshal(bufForm.Bytes(), &form); err != nil {
					fmt.Println(err)
					return nil, err
				}

				return &form, nil
			}
		default:
			fmt.Printf("%s : %c %s %s\n",
				"Unknown type",
				header.Typeflag,
				"in file",
				name,
			)
		}
	}
	return nil, errors.New("no form.yaml found")
}
