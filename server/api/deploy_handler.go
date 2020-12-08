package api

import (
	"net/http"
)

// HandleDeployTemplate triggers a chart deployment from a template
func (app *App) HandleDeployTemplate(w http.ResponseWriter, r *http.Request) {
	// vals, err := url.ParseQuery(r.URL.RawQuery)

	// if err != nil {
	// 	app.handleErrorFormDecoding(err, ErrReleaseDecode, w)
	// 	return
	// }

	// form := &forms.InstallChartTemplateForm{
	// 	ReleaseForm: &forms.ReleaseForm{
	// 		Form: &helm.Form{
	// 			Repo: app.repo,
	// 		},
	// 	},
	// 	ChartTemplateForm: &forms.ChartTemplateForm{},
	// }

	// form.ReleaseForm.PopulateHelmOptionsFromQueryParams(
	// 	vals,
	// 	app.repo.Cluster,
	// )

	// if err := json.NewDecoder(r.Body).Decode(form); err != nil {
	// 	app.handleErrorFormDecoding(err, ErrUserDecode, w)
	// 	return
	// }

	// agent, err := app.getAgentFromReleaseForm(
	// 	w,
	// 	r,
	// 	form.ReleaseForm,
	// )

	// if err != nil {
	// 	return
	// }

	// baseURL := "https://porter-dev.github.io/chart-repo/"
	// values, err := getDefaultValues(form.ChartTemplateForm.TemplateName, baseURL)
	// if err != nil {
	// 	return
	// }

	// // Set image URL
	// if form.ChartTemplateForm.ImageURL != "" {
	// 	(*values)["image"].(map[interface{}]interface{})["repository"] = form.ChartTemplateForm.ImageURL
	// }

	// // Loop through form params to override
	// for k := range form.ChartTemplateForm.FormValues {
	// 	switch v := interface{}(k).(type) {
	// 	case string:
	// 		splits := strings.Split(v, ".")

	// 		// Validate that the field to override exists
	// 		currentLoc := *values
	// 		for s := range splits {
	// 			key := splits[s]
	// 			val := currentLoc[key]
	// 			if val == nil {
	// 				fmt.Printf("No such field: %v\n", key)
	// 			} else if s == len(splits)-1 {
	// 				newValue := form.ChartTemplateForm.FormValues[v]
	// 				fmt.Printf("Overriding default %v with %v\n", val, newValue)
	// 				currentLoc[key] = newValue
	// 			} else {
	// 				fmt.Println("Traversing...")
	// 				currentLoc = val.(map[interface{}]interface{})
	// 			}
	// 		}
	// 	default:
	// 		fmt.Println("Non-string type")
	// 	}
	// }

	// v, err := yaml.Marshal(values)

	// if err != nil {
	// 	return
	// }

	// var tgz string
	// switch form.ChartTemplateForm.TemplateName {
	// case "redis":
	// 	tgz = "redis-0.0.1.tgz"
	// }

	// // Output values.yaml string
	// _, err = agent.InstallChart(
	// 	"./internal/local_templates/"+tgz,
	// 	v,
	// 	form.ChartTemplateForm.Name,
	// 	form.ReleaseForm.Form.Namespace,
	// )

	// if err != nil {
	// 	app.sendExternalError(err, http.StatusInternalServerError, HTTPError{
	// 		Code:   ErrReleaseDeploy,
	// 		Errors: []string{"error installing a new chart: " + err.Error()},
	// 	}, w)

	// 	return
	// }

	// w.WriteHeader(http.StatusOK)
}
