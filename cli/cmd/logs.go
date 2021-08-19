package cmd

import (
	"fmt"
	"os"

	api "github.com/porter-dev/porter/api/client"
	"github.com/porter-dev/porter/cli/cmd/utils"
	"github.com/spf13/cobra"
)

// logsCmd represents the "porter logs" base command when called
// without any subcommands
var logsCmd = &cobra.Command{
	Use:   "logs [release]",
	Args:  cobra.ExactArgs(1),
	Short: "Logs the output from a given application.",
	Run: func(cmd *cobra.Command, args []string) {
		err := checkLoginAndRun(args, logs)

		if err != nil {
			os.Exit(1)
		}
	},
}

var follow bool

func init() {
	rootCmd.AddCommand(logsCmd)

	logsCmd.PersistentFlags().StringVar(
		&namespace,
		"namespace",
		"default",
		"namespace of release to connect to",
	)

	logsCmd.PersistentFlags().BoolVarP(
		&follow,
		"follow",
		"f",
		false,
		"specify if the logs should be streamed",
	)
}

func logs(_ *api.AuthCheckResponse, client *api.Client, args []string) error {
	podsSimple, err := getPods(client, namespace, args[0])

	if err != nil {
		return fmt.Errorf("Could not retrieve list of pods: %s", err.Error())
	}

	// if length of pods is 0, throw error
	var selectedPod podSimple

	if len(podsSimple) == 0 {
		return fmt.Errorf("At least one pod must exist in this deployment.")
	} else if len(podsSimple) == 1 {
		selectedPod = podsSimple[0]
	} else {
		podNames := make([]string, 0)

		for _, podSimple := range podsSimple {
			podNames = append(podNames, podSimple.Name)
		}

		selectedPodName, err := utils.PromptSelect("Select the pod:", podNames)

		if err != nil {
			return err
		}

		// find selected pod
		for _, podSimple := range podsSimple {
			if selectedPodName == podSimple.Name {
				selectedPod = podSimple
			}
		}
	}

	var selectedContainerName string

	// if the selected pod has multiple container, spawn selector
	if len(selectedPod.ContainerNames) == 0 {
		return fmt.Errorf("At least one pod must exist in this deployment.")
	} else if len(selectedPod.ContainerNames) == 1 {
		selectedContainerName = selectedPod.ContainerNames[0]
	} else {
		selectedContainer, err := utils.PromptSelect("Select the container:", selectedPod.ContainerNames)

		if err != nil {
			return err
		}

		selectedContainerName = selectedContainer
	}

	config := &PorterRunSharedConfig{
		Client: client,
	}

	err = config.setSharedConfig()

	if err != nil {
		return fmt.Errorf("Could not retrieve kube credentials: %s", err.Error())
	}

	_, err = pipePodLogsToStdout(config, namespace, selectedPod.Name, selectedContainerName, follow)

	return err
}
