package cmd

import (
	"encoding/json"
	"fmt"
	"os"

	"github.com/fatih/color"
	"github.com/porter-dev/porter/internal/models"
	"github.com/spf13/cobra"
)

var testCmd = &cobra.Command{
	Use:   "test",
	Short: "Testing",
	Run: func(cmd *cobra.Command, args []string) {
		// chart, err := loader.LoadChart("https://porter-dev.github.io/chart-repo", "docker", "0.0.1")

		// if err != nil {
		// 	red := color.New(color.FgRed)
		// 	red.Println("Error running test:", err.Error())
		// 	os.Exit(1)
		// }

		// bytes, err := yaml.Marshal(chart)

		// if err != nil {
		// 	red := color.New(color.FgRed)
		// 	red.Println("Error running test:", err.Error())
		// 	os.Exit(1)
		// }

		// fmt.Println(string(bytes))

		form := &models.FormYAML{
			Tabs: []*models.FormTab{
				&models.FormTab{
					Context: &models.FormContext{
						Type: "helm/values",
					},
					Name:  "main",
					Label: "Main Settings",
					Sections: []*models.FormSection{
						&models.FormSection{
							Name: "section_one",
							Contents: []*models.FormContent{
								&models.FormContent{
									Type:  "number-input",
									Value: "service.targetPort",
									Label: "Target Port",
									Settings: struct {
										Default interface{} `yaml:"default,omitempty" json:"default,omitempty"`
										Unit    interface{} `yaml:"unit,omitempty" json:"unit,omitempty"`
									}{
										Default: 8000,
									},
								},
							},
						},
					},
				},
				&models.FormTab{
					Context: &models.FormContext{
						Type: "cluster",
					},
					Name:  "crd",
					Label: "CRDs",
					Sections: []*models.FormSection{
						&models.FormSection{
							Name: "section_one",
							Contents: []*models.FormContent{
								&models.FormContent{
									Type:  "resourcelist",
									Value: `[{"name": "resource_1"}]`,
								},
							},
						},
					},
				},
			},
		}

		bytes, err := json.Marshal(form)

		if err != nil {
			red := color.New(color.FgRed)
			red.Println("Error running test:", err.Error())
			os.Exit(1)
		}

		fmt.Println(string(bytes))
	},
}

func init() {
	rootCmd.AddCommand(testCmd)
}

// // FormSection is a section of a form
// type FormSection struct {
// 	Context  *FormContext   `yaml:"context" json:"context"`
// 	Name     string         `yaml:"name" json:"name"`
// 	ShowIf   string         `yaml:"show_if" json:"show_if"`
// 	Contents []*FormContent `yaml:"contents" json:"contents,omitempty"`
// }

// // FormContent is a form's atomic unit
// type FormContent struct {
// 	Context  *FormContext `yaml:"context" json:"context"`
// 	Type     string       `yaml:"type" json:"type"`
// 	Label    string       `yaml:"label" json:"label"`
// 	Name     string       `yaml:"name,omitempty" json:"name,omitempty"`
// 	Value    interface{}  `yaml:"value,omitempty" json:"value,omitempty"`
// 	Settings struct {
// 		Default interface{} `yaml:"default,omitempty" json:"default,omitempty"`
// 		Unit    interface{} `yaml:"unit,omitempty" json:"unit,omitempty"`
// 	} `yaml:"settings,omitempty" json:"settings,omitempty"`
// }
