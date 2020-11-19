package api

import (
	"archive/tar"
	"bytes"
	"compress/gzip"
	"errors"
	"fmt"
	"io"
	"io/ioutil"
	"net/http"
	"strings"

	"github.com/porter-dev/porter/internal/models"
	"gopkg.in/yaml.v2"
)

// HandleDeployTemplate triggers a chart deployment from a template
func (app *App) HandleDeployTemplate(w http.ResponseWriter, r *http.Request) {
	tgt := "hello-porter"

	baseURL := "https://porter-dev.github.io/chart-repo/"
	resp, err := http.Get(baseURL + "index.yaml")
	if err != nil {
		fmt.Println(err)
		return
	}

	defer resp.Body.Close()
	body, _ := ioutil.ReadAll(resp.Body)

	form := models.IndexYAML{}
	if err := yaml.Unmarshal([]byte(body), &form); err != nil {
		fmt.Println(err)
		return
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
		if strAcc == tgt {
			tgtURL := baseURL + tarURL
			values, err := processValues(tgtURL)
			if err != nil {
				fmt.Println(err)
				return
			}

			defaultValues := *values
			defaultValues["replicaCount"] = 87
			fmt.Println(defaultValues["replicaCount"])
			for k := range *values {
				fmt.Println(k)
			}
		}
	}
}

func processValues(tgtURL string) (*map[string]interface{}, error) {
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
				form := make(map[string]interface{})
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
