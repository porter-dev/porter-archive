package cmd

import (
	"context"
	"fmt"
	"os"
	"strings"

	"github.com/fatih/color"
	"github.com/porter-dev/porter/cli/cmd/api"
	"github.com/porter-dev/porter/cli/cmd/utils"
	"github.com/spf13/cobra"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
	"k8s.io/client-go/tools/remotecommand"
	"k8s.io/kubectl/pkg/util/term"
)

var namespace string

// runCmd represents the "porter run" base command when called
// without any subcommands
var runCmd = &cobra.Command{
	Use:   "run [release] -- COMMAND [args...]",
	Args:  cobra.MinimumNArgs(2),
	Short: "Runs a command inside a connected cluster container.",
	Run: func(cmd *cobra.Command, args []string) {
		err := checkLoginAndRun(args, run)

		if err != nil {
			os.Exit(1)
		}
	},
}

func init() {
	rootCmd.AddCommand(runCmd)

	runCmd.PersistentFlags().StringVar(
		&host,
		"host",
		getHost(),
		"host url of Porter instance",
	)

	runCmd.PersistentFlags().StringVar(
		&namespace,
		"namespace",
		"default",
		"namespace of release to connect to",
	)
}

func run(_ *api.AuthCheckResponse, client *api.Client, args []string) error {
	color.New(color.FgGreen).Println("Running", strings.Join(args[1:], " "), "for release", args[0])

	podNames, err := getPods(client, namespace, args[0])

	if err != nil {
		return fmt.Errorf("Could not retrieve list of pods: %s", err.Error())
	}

	// if length of pods is 0, throw error
	pod := ""

	if len(podNames) == 0 {
		return fmt.Errorf("At least one pod must exist in this deployment.")
	} else if len(podNames) == 1 {
		pod = podNames[0]
	} else {
		pod, err = utils.PromptSelect("Select the pod:", podNames)

		if err != nil {
			return err
		}
	}

	restConf, err := getRESTConfig(client)

	if err != nil {
		return fmt.Errorf("Could not retrieve kube credentials: %s", err.Error())
	}

	return executeRun(restConf, namespace, pod, args[1:])
}

func getRESTConfig(client *api.Client) (*rest.Config, error) {
	pID := getProjectID()
	cID := getClusterID()

	kubeResp, err := client.GetKubeconfig(context.TODO(), pID, cID)

	if err != nil {
		return nil, err
	}

	kubeBytes := kubeResp.Kubeconfig

	cmdConf, err := clientcmd.NewClientConfigFromBytes(kubeBytes)

	if err != nil {
		return nil, err
	}

	restConf, err := cmdConf.ClientConfig()

	if err != nil {
		return nil, err
	}

	restConf.GroupVersion = &schema.GroupVersion{
		Group:   "api",
		Version: "v1",
	}

	restConf.NegotiatedSerializer = runtime.NewSimpleNegotiatedSerializer(runtime.SerializerInfo{})

	return restConf, nil
}

func getPods(client *api.Client, namespace, releaseName string) ([]string, error) {
	pID := getProjectID()
	cID := getClusterID()

	resp, err := client.GetK8sAllPods(context.TODO(), pID, cID, namespace, releaseName)

	if err != nil {
		return nil, err
	}

	res := make([]string, 0)

	for _, pod := range resp {
		res = append(res, pod.ObjectMeta.Name)
	}

	return res, nil
}

func executeRun(config *rest.Config, namespace, name string, args []string) error {
	restClient, err := rest.RESTClientFor(config)

	if err != nil {
		return err
	}

	req := restClient.Post().
		Resource("pods").
		Name(name).
		Namespace(namespace).
		SubResource("exec")

	// req.Param("container", "web")
	for _, arg := range args {
		req.Param("command", arg)
	}
	req.Param("stdin", "true")
	req.Param("stdout", "true")
	req.Param("tty", "true")

	t := term.TTY{
		In:  os.Stdin,
		Out: os.Stdout,
		Raw: true,
	}

	fn := func() error {
		exec, err := remotecommand.NewSPDYExecutor(config, "POST", req.URL())

		if err != nil {
			return err
		}

		return exec.Stream(remotecommand.StreamOptions{
			Stdin:  os.Stdin,
			Stdout: os.Stdout,
			Stderr: os.Stderr,
			Tty:    true,
		})
	}

	if err := t.Safe(fn); err != nil {
		return err
	}

	return err
}
