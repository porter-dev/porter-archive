package cmd

import (
	"fmt"
	"os"

	"github.com/fatih/color"
	"github.com/porter-dev/porter/internal/helm/loader"
	"github.com/spf13/cobra"
	"sigs.k8s.io/yaml"
)

var testCmd = &cobra.Command{
	Use:   "test",
	Short: "Testing",
	Run: func(cmd *cobra.Command, args []string) {
		chart, err := loader.LoadChart("https://porter-dev.github.io/chart-repo", "docker", "0.0.1")

		if err != nil {
			red := color.New(color.FgRed)
			red.Println("Error running test:", err.Error())
			os.Exit(1)
		}

		bytes, err := yaml.Marshal(chart)

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
