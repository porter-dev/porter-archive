package commands

import (
	"context"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"os/signal"
	"time"

	"github.com/briandowns/spinner"
	"github.com/fatih/color"
	api "github.com/porter-dev/porter/api/client"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/cli/cmd/config"
	"github.com/spf13/cobra"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/portforward"
	"k8s.io/client-go/transport/spdy"
)

var port int

const (
	// Address_Localhost is the localhost address
	Address_Localhost = "localhost"
)

func registerCommand_Datastore(cliConf config.CLIConfig) *cobra.Command {
	datastoreCmd := &cobra.Command{
		Use:   "datastore",
		Short: "Runs a command for your datastore.",
	}

	datastoreConnectCmd := &cobra.Command{
		Use:   "connect <DATASTORE_NAME>",
		Short: "Forward a local port to a remote datastore.",
		Args:  cobra.MinimumNArgs(1),
		Run: func(cmd *cobra.Command, args []string) {
			err := checkLoginAndRunWithConfig(cmd, cliConf, args, datastoreConnect)
			if err != nil {
				os.Exit(1)
			}
		},
	}

	datastoreConnectCmd.PersistentFlags().IntVarP(
		&port,
		"port",
		"p",
		8122,
		"the local port to forward",
	)

	datastoreCmd.AddCommand(datastoreConnectCmd)

	return datastoreCmd
}

func forwardPorts(
	method string,
	url *url.URL,
	kubeConfig *rest.Config,
	ports []string,
	stopChan <-chan struct{},
	readyChan chan struct{},
) error {
	transport, upgrader, err := spdy.RoundTripperFor(kubeConfig)
	if err != nil {
		return err
	}

	dialer := spdy.NewDialer(upgrader, &http.Client{Transport: transport}, method, url)
	fw, err := portforward.NewOnAddresses(
		dialer, []string{Address_Localhost}, ports, stopChan, readyChan, os.Stdout, os.Stderr)
	if err != nil {
		return err
	}

	return fw.ForwardPorts()
}

func datastoreConnect(ctx context.Context, _ *types.GetAuthenticatedUserResponse, client api.Client, cliConf config.CLIConfig, ff config.FeatureFlags, _ *cobra.Command, args []string) error {
	if cliConf.Project == 0 {
		return fmt.Errorf("project not set; please select a project with porter config set-project and try again")
	}
	projectId := cliConf.Project
	datastoreName := args[0]
	if datastoreName == "" {
		return fmt.Errorf("no datastore name provided")
	}

	if port == 0 {
		return fmt.Errorf("port must be provided")
	}

	s := spinner.New(spinner.CharSets[9], 100*time.Millisecond)
	s.Color("cyan") // nolint:errcheck,gosec
	s.Suffix = fmt.Sprintf(" Creating secure tunnel to datastore named %s in project %d...", datastoreName, projectId)

	s.Start()
	resp, err := client.CreateDatastoreProxy(ctx, projectId, datastoreName, &types.CreateDatastoreProxyRequest{})
	if err != nil {
		return fmt.Errorf("could not create secure tunnel: %s", err.Error())
	}
	s.Stop()

	datastoreCredential := resp.Credential
	cliConf.Cluster = resp.ClusterID
	config := &KubernetesSharedConfig{
		Client:    client,
		CLIConfig: cliConf,
	}

	err = config.setSharedConfig(ctx)
	if err != nil {
		return fmt.Errorf("could not retrieve kube credentials: %s", err.Error())
	}

	proxyPod, err := config.Clientset.CoreV1().Pods(resp.Namespace).Get(
		ctx,
		resp.PodName,
		metav1.GetOptions{},
	)
	if err != nil {
		return fmt.Errorf("could not connect to secure tunnel: %s", err.Error())
	}

	defer appDeletePod(ctx, config, resp.PodName, resp.Namespace) //nolint:errcheck,gosec

	s = spinner.New(spinner.CharSets[9], 100*time.Millisecond)
	s.Color("green") // nolint:errcheck,gosec
	s.Suffix = " Waiting for secure tunnel to datastore to be ready..."

	s.Start()
	if err = appWaitForPod(ctx, config, proxyPod); err != nil {
		color.New(color.FgRed).Println("error occurred while waiting for secure tunnel to be ready") // nolint:errcheck,gosec
		return err
	}
	s.Stop()

	stopChannel := make(chan struct{}, 1)
	readyChannel := make(chan struct{})

	signals := make(chan os.Signal, 1)
	signal.Notify(signals, os.Interrupt)
	defer signal.Stop(signals)

	go func() {
		<-signals
		if stopChannel != nil {
			close(stopChannel)
		}
	}()

	req := config.RestClient.Post().
		Resource("pods").
		Namespace(resp.Namespace).
		Name(proxyPod.Name).
		SubResource("portforward")

	printDatastoreConnectionInformation(resp.Type, port, datastoreCredential)

	color.New(color.FgGreen).Println("Starting proxy...[CTRL-C to exit]") // nolint:errcheck,gosec
	return forwardPorts("POST", req.URL(), config.RestConf, []string{fmt.Sprintf("%d:%d", port, datastoreCredential.Port)}, stopChannel, readyChannel)
}

func printDatastoreConnectionInformation(datastoreType string, port int, credential types.DatastoreCredential) {
	color.New(color.FgGreen).Println("Secure tunnel setup complete! While the tunnel is running, you can connect to your datastore using the following credentials:") //nolint:errcheck,gosec

	fmt.Printf(" Host: 127.0.0.1\n")
	fmt.Printf(" Port: %d\n", port)
	if credential.DatabaseName != "" {
		fmt.Printf(" Database name: %s\n", credential.DatabaseName)
	}
	if credential.Username != "" {
		fmt.Printf(" Username: %s\n", credential.Username)
	}
	if credential.Password != "" {
		fmt.Printf(" Password: %s\n", credential.Password)
	}
	switch datastoreType {
	case string(types.DatastoreType_ElastiCache):
		fmt.Println()
		color.New(color.FgGreen).Println("For example, you can connect to your datastore using the following command:") //nolint:errcheck,gosec
		fmt.Printf(" redis-cli -p %d -a %s --tls\n", port, credential.Password)
	case string(types.DatastoreType_RDS):
		fmt.Println()
		color.New(color.FgGreen).Println("For example, you can connect to your datastore using the following command:") //nolint:errcheck,gosec
		fmt.Printf(" PGPASSWORD=%s psql -h 127.0.0.1 -p %d -U %s -d %s\n", credential.Password, port, credential.Username, credential.DatabaseName)
	}
	fmt.Println()
}
