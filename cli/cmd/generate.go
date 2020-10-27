package cmd

import (
	"fmt"
	"path/filepath"

	"github.com/porter-dev/porter/internal/kubernetes/local"
	"github.com/porter-dev/porter/internal/utils"

	gcpLocal "github.com/porter-dev/porter/internal/providers/gcp/local"

	"k8s.io/client-go/tools/clientcmd"
	"k8s.io/client-go/util/homedir"

	"github.com/spf13/cobra"
)

var (
	outputFile     string
	kubeconfigPath string
	print          *bool
	contexts       *[]string
)

// generateCmd represents the generate command
var generateCmd = &cobra.Command{
	Use:   "generate",
	Short: "Generates a kubeconfig with certificate data added",
	Run: func(cmd *cobra.Command, args []string) {
		generate(kubeconfigPath, outputFile, *print, *contexts)
	},
}

func init() {
	home := homedir.HomeDir()

	rootCmd.AddCommand(generateCmd)

	generateCmd.PersistentFlags().StringVarP(
		&outputFile,
		"output",
		"o",
		filepath.Join(home, ".porter", "porter.kubeconfig"),
		"output file location",
	)

	generateCmd.PersistentFlags().StringVarP(
		&kubeconfigPath,
		"kubeconfig",
		"k",
		"",
		"path to kubeconfig",
	)

	contexts = generateCmd.PersistentFlags().StringArray(
		"contexts",
		nil,
		"the list of contexts to use (defaults to the current context)",
	)

	print = generateCmd.PersistentFlags().BoolP(
		"print",
		"p",
		false,
		"print result to stdout, without writing to the fs",
	)
}

func generate(kubeconfigPath string, output string, print bool, contexts []string) error {
	conf, err := local.GetConfigFromHostWithCertData(kubeconfigPath, contexts)

	if err != nil {
		return err
	}

	rawConf, err := conf.RawConfig()

	if err != nil {
		return err
	}

	if print {
		bytes, err := clientcmd.Write(rawConf)

		if err != nil {
			return err
		}

		fmt.Printf(string(bytes))

		return nil
	}

	err = clientcmd.WriteToFile(rawConf, output)

	if err != nil {
		return err
	}

	return nil
}

// TODO -- error handling, stop hard-coding, ask for permissions
func gcpHelper() {
	agent, _ := gcpLocal.NewDefaultAgent()

	agent.ProjectID = "PROJECT_ID"
	name := "porter-dashboard-" + utils.StringWithCharset(6, "abcdefghijklmnopqrstuvwxyz1234567890")
	resp, err := agent.CreateServiceAccount(name)

	if err != nil {
		fmt.Printf("Error was %v\n", err)
		return
	}

	err = agent.SetServiceAccountIAMPolicy(resp)

	if err != nil {
		fmt.Printf("Error was %v\n", err)
		return
	}
}
