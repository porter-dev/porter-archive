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

	"github.com/porter-dev/porter/internal/models"
	"gopkg.in/yaml.v2"
)

// DeployTemplateForm describes the parameters of a deploy template request
type DeployTemplateForm struct {
	TemplateName string
	ClusterID    int
	ImageURL     string
	FormValues   map[string]interface{}
}

// HandleDeployTemplate triggers a chart deployment from a template
func (app *App) HandleDeployTemplate(w http.ResponseWriter, r *http.Request) {

	// TODO: use create form
	requestForm := make(map[string]interface{})

	// decode from JSON to form value
	if err := json.NewDecoder(r.Body).Decode(&requestForm); err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	// TODO: use create form
	params := DeployTemplateForm{}
	params.TemplateName = requestForm["templateName"].(string)
	params.ClusterID = int(requestForm["clusterID"].(float64))
	params.ImageURL = requestForm["imageURL"].(string)
	params.FormValues = requestForm["formValues"].(map[string]interface{})

	baseURL := "https://porter-dev.github.io/chart-repo/"
	defaultValues, err := getDefaultValues(params.TemplateName, baseURL)
	if err != nil {
		return
	}

	// Set image URL
	(*defaultValues)["image"].(map[interface{}]interface{})["repository"] = params.ImageURL

	// Loop through form params to override
	for k := range params.FormValues {
		switch v := interface{}(k).(type) {
		case string:
			splits := strings.Split(v, ".")

			// Validate that the field to override exists
			currentLoc := *defaultValues
			for s := range splits {
				key := splits[s]
				val := currentLoc[key]
				if val == nil {
					fmt.Printf("No such field: %v\n", key)
				} else if s == len(splits)-1 {
					newValue := params.FormValues[v]
					fmt.Printf("Overriding default %v with %v\n", val, newValue)
					currentLoc[key] = newValue
				} else {
					fmt.Println("Traversing...")
					currentLoc = val.(map[interface{}]interface{})
				}
			}
		default:
			fmt.Println("Non-string type")
		}
	}

	d, err := yaml.Marshal(defaultValues)
	if err != nil {
		return
	}

	// Output values.yaml string
	fmt.Println(string(d))
}

func getDefaultValues(templateName string, baseURL string) (*map[interface{}]interface{}, error) {
	resp, err := http.Get(baseURL + "index.yaml")
	if err != nil {
		fmt.Println(err)
		return nil, err
	}

	defer resp.Body.Close()
	body, _ := ioutil.ReadAll(resp.Body)

	form := models.IndexYAML{}
	if err := yaml.Unmarshal([]byte(body), &form); err != nil {
		fmt.Println(err)
		return nil, err
	}

	// Loop over charts in index.yaml
	for k := range form.Entries {
		indexChart := form.Entries[k][0]
		tarURL := indexChart.Urls[0]
		splits := strings.Split(tarURL, "-")

		strAcc := splits[0]
		for i := 1; i < len(splits)-1; i++ {
			strAcc += "-" + splits[i]
		}

		// Unpack the target chart and retrieve values.yaml
		if strAcc == templateName {
			tgtURL := baseURL + tarURL
			values, err := processValues(tgtURL)
			if err != nil {
				fmt.Println(err)
				return nil, err
			}
			return values, nil
		}
	}
	return nil, errors.New("no values.yaml found")
}

func processValues(tgtURL string) (*map[interface{}]interface{}, error) {
	resp, err := http.Get(tgtURL)
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

	// Process tarball to generate FormYAML and retrieve markdown
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

			// Handle values.yaml located in archive
			if strings.Contains(name, "values.yaml") {
				bufForm := new(bytes.Buffer)

				_, err := io.Copy(bufForm, tarReader)
				if err != nil {
					fmt.Println(err)
					return nil, err
				}

				// Unmarshal yaml byte buffer
				form := make(map[interface{}]interface{})
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
	return nil, errors.New("no values.yaml found")
}
