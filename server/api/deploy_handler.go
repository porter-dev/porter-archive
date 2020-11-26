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
	"net/url"
	"strings"

	"github.com/porter-dev/porter/internal/forms"
	"github.com/porter-dev/porter/internal/helm"
	"github.com/porter-dev/porter/internal/models"
	"gopkg.in/yaml.v2"
)

// HandleDeployTemplate triggers a chart deployment from a template
func (app *App) HandleDeployTemplate(w http.ResponseWriter, r *http.Request) {
	vals, err := url.ParseQuery(r.URL.RawQuery)
	if err != nil {
		app.handleErrorFormDecoding(err, ErrReleaseDecode, w)
		return
	}

	form := &forms.InstallChartTemplateForm{
		ReleaseForm: &forms.ReleaseForm{
			Form: &helm.Form{
				Repo: app.repo,
			},
		},
		ChartTemplateForm: &forms.ChartTemplateForm{},
	}

	form.ReleaseForm.PopulateHelmOptionsFromQueryParams(
		vals,
		app.repo.Cluster,
	)

	if err := json.NewDecoder(r.Body).Decode(form); err != nil {
		app.handleErrorFormDecoding(err, ErrUserDecode, w)
		return
	}

	agent, err := app.getAgentFromReleaseForm(
		w,
		r,
		form.ReleaseForm,
	)

	if err != nil {
		return
	}

	baseURL := "https://porter-dev.github.io/chart-repo/"
	values, err := getDefaultValues(form.ChartTemplateForm.TemplateName, baseURL)
	if err != nil {
		return
	}

	// Set image URL
	(*values)["image"].(map[interface{}]interface{})["repository"] = form.ChartTemplateForm.ImageURL

	// Loop through form params to override
	for k := range form.ChartTemplateForm.FormValues {
		switch v := interface{}(k).(type) {
		case string:
			splits := strings.Split(v, ".")

			// Validate that the field to override exists
			currentLoc := *values
			for s := range splits {
				key := splits[s]
				val := currentLoc[key]
				if val == nil {
					fmt.Printf("No such field: %v\n", key)
				} else if s == len(splits)-1 {
					newValue := form.ChartTemplateForm.FormValues[v]
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

	v, err := yaml.Marshal(values)

	if err != nil {
		return
	}

	// Output values.yaml string
	_, err = agent.InstallChart(baseURL+"react-0.1.5.tgz", v)

	if err != nil {
		app.sendExternalError(err, http.StatusInternalServerError, HTTPError{
			Code:   ErrReleaseDeploy,
			Errors: []string{"error installing a new chart" + err.Error()},
		}, w)

		return
	}

	w.WriteHeader(http.StatusOK)
}

// ------------------------ Deploy handler helper functions ------------------------ //

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
