package cmd

import (
	"context"
	"fmt"
	"os"

	"github.com/porter-dev/porter/cli/cmd/api"
	"github.com/spf13/cobra"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
	"k8s.io/client-go/tools/remotecommand"
	"k8s.io/kubectl/pkg/util/term"
)

// runCmd represents the "porter run" base command when called
// without any subcommands
var runCmd = &cobra.Command{
	Use:   "run [cmd]",
	Args:  cobra.ExactArgs(1),
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
}

func run(_ *api.AuthCheckResponse, client *api.Client, args []string) error {
	podNames, err := getPods(client)

	if err != nil {
		return fmt.Errorf("Could not retrieve list of pods: %s", err.Error())
	}

	restConf, err := getRESTConfig(client)

	if err != nil {
		return fmt.Errorf("Could not retrieve kube credentials: %s", err.Error())
	}

	return executeRun(restConf, "default", podNames[0])
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

func getPods(client *api.Client) ([]string, error) {
	pID := getProjectID()
	cID := getClusterID()

	resp, err := client.GetK8sAllPods(context.TODO(), pID, cID, "default", "same-name")

	if err != nil {
		return nil, err
	}

	res := make([]string, 0)

	for _, pod := range resp {
		res = append(res, pod.ObjectMeta.Name)
	}

	return res, nil
}

func executeRun(config *rest.Config, namespace, name string) error {
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
	req.Param("command", "sh")
	req.Param("stdin", "true")
	req.Param("stdout", "true")
	req.Param("tty", "true")

	t := term.TTY{
		In:  os.Stdin,
		Out: os.Stdout,
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
