package commands

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"time"

	"github.com/briandowns/spinner"
	"github.com/fatih/color"
	api "github.com/porter-dev/porter/api/client"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/cli/cmd/config"
	"github.com/porter-dev/porter/cli/cmd/utils"
	"github.com/spf13/cobra"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/portforward"
	"k8s.io/client-go/transport/spdy"
)

var port int

const (
	Namespace_PorterEnvGroup = "porter-env-group"
	Namespace_Default        = "default"
	LabelKey_Datastore       = "porter.run/environment-group-datastore"
	DatabaseName             = "postgres"
	Address_Localhost        = "localhost"
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
	s.Color("cyan")
	s.Suffix = fmt.Sprintf(" Retrieving datastore named %s in project %d...", datastoreName, projectId)
	s.Start()
	datastoreResp, err := client.GetDatastore(ctx, projectId, datastoreName)
	if err != nil {
		return fmt.Errorf("could not retrieve datastore: %s", err.Error())
	}
	if datastoreResp == nil {
		return fmt.Errorf("could not retrieve datastore")
	}
	datastore := datastoreResp.Datastore
	if datastore.Name == "" {
		return fmt.Errorf("datastore not found in project")
	}
	if datastore.CloudProvider == "" || datastore.CloudProviderCredentialIdentifier == "" {
		return fmt.Errorf("datastore cloud provider credentials not found")
	}
	var datastoreType types.DatastoreType
	switch datastore.Type {
	case types.DatastoreType_ElastiCache:
		datastoreType = types.DatastoreType_ElastiCache
	case types.DatastoreType_RDS:
		datastoreType = types.DatastoreType_RDS
	default:
		return fmt.Errorf("unsupported datastore type")
	}
	s.Stop()

	clusterList, err := client.ListProjectClusters(ctx, projectId)
	if err != nil {
		return fmt.Errorf("could not retrieve clusters: %s", err.Error())
	}
	if clusterList == nil {
		return fmt.Errorf("could not retrieve clusters")
	}
	filteredClusters := []types.Cluster{}
	for _, cluster := range *clusterList {
		if cluster != nil && cluster.CloudProvider == string(datastore.CloudProvider) && cluster.CloudProviderCredentialIdentifier == datastore.CloudProviderCredentialIdentifier {
			filteredClusters = append(filteredClusters, *cluster)
		}
	}
	if len(filteredClusters) == 0 {
		return fmt.Errorf("could not find associated cluster for datastore")
	}
	clusterId := filteredClusters[0].ID

	if len(filteredClusters) > 1 {
		clusterName, err := utils.PromptSelect("Select the cluster your datastore is associated with", func() []string {
			var names []string

			for _, cluster := range filteredClusters {
				names = append(names, fmt.Sprintf("%s - %d", cluster.Name, cluster.ID))
			}

			return names
		}())
		if err != nil {
			return err
		}

		clusterId64, err := strconv.ParseUint(strings.Split(clusterName, " - ")[1], 10, 64)
		if err != nil {
			return fmt.Errorf("error parsing cluster: %w", err)
		}
		clusterId = uint(clusterId64)
	}

	cliConf.Cluster = clusterId
	config := &KubernetesSharedConfig{
		Client:    client,
		CLIConfig: cliConf,
	}

	err = config.setSharedConfig(ctx)
	if err != nil {
		return fmt.Errorf("could not retrieve kube credentials: %s", err.Error())
	}

	datastoreCredential, err := datastoreCredential(datastoreCredentialInput{
		DatastoreName: datastoreName,
		DatastoreType: datastoreType,
		Clientset:     config.Clientset,
	})
	if err != nil {
		return fmt.Errorf("error retrieving datastore credentials: %w", err)
	}

	pod := &corev1.Pod{
		ObjectMeta: metav1.ObjectMeta{
			Name: strings.ToLower(fmt.Sprintf("datastore-connect-proxy-%s", utils.String(4))),
			Labels: map[string]string{
				"porter/ephemeral-pod": "true",
			},
		},
		Spec: corev1.PodSpec{
			Containers: []corev1.Container{
				{
					Name:  "datastore-connect-proxy",
					Image: "alpine/socat",
					Command: []string{
						"socat",
						"-dd",
						fmt.Sprintf("tcp4-listen:%d,fork,reuseaddr", datastoreCredential.Port),
						fmt.Sprintf("tcp4:%s:%d", datastoreCredential.Host, datastoreCredential.Port),
					},
					Ports: []corev1.ContainerPort{
						{
							ContainerPort: int32(datastoreCredential.Port),
						},
					},
				},
			},
		},
	}

	s = spinner.New(spinner.CharSets[9], 100*time.Millisecond)
	s.Color("cyan")
	s.Suffix = " Creating secure tunnel to datastore..."

	s.Start()
	proxyPod, err := config.Clientset.CoreV1().Pods(Namespace_Default).Create(context.TODO(), pod, metav1.CreateOptions{})
	if err != nil {
		return err
	}
	s.Stop()

	defer appDeletePod(ctx, config, proxyPod.Name, Namespace_Default)

	s = spinner.New(spinner.CharSets[9], 100*time.Millisecond)
	s.Color("green")
	s.Suffix = " Waiting for secure tunnel to datastore to be ready..."

	s.Start()
	if err = appWaitForPod(ctx, config, proxyPod); err != nil {
		color.New(color.FgRed).Println("error occurred while waiting for secure tunnel to be ready")
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
		Namespace(namespace).
		Name(pod.Name).
		SubResource("portforward")

	printDatastoreConnectionInformation(datastoreType, port, datastoreCredential)

	color.New(color.FgGreen).Println("Starting proxy...[CTRL-C to exit]")
	return forwardPorts("POST", req.URL(), config.RestConf, []string{fmt.Sprintf("%d:%d", port, datastoreCredential.Port)}, stopChannel, readyChannel)
}

type datastoreCredentialInput struct {
	DatastoreName string
	DatastoreType types.DatastoreType
	Clientset     *kubernetes.Clientset
}

func datastoreCredential(inp datastoreCredentialInput) (types.DatastoreCredential, error) {
	credential := types.DatastoreCredential{
		DatabaseName: DatabaseName,
	}

	configMaps, err := inp.Clientset.CoreV1().ConfigMaps(Namespace_PorterEnvGroup).List(context.TODO(), metav1.ListOptions{
		LabelSelector: fmt.Sprintf("%s=%s", LabelKey_Datastore, inp.DatastoreName),
	})
	if err != nil {
		return credential, fmt.Errorf("error retrieving config map %s", err.Error())
	}

	if len(configMaps.Items) == 0 {
		return credential, fmt.Errorf("config map not found")
	}

	if len(configMaps.Items) > 1 {
		return credential, fmt.Errorf("multiple config maps matching the same datastore found")
	}

	cm := configMaps.Items[0]

	secrets, err := inp.Clientset.CoreV1().Secrets(Namespace_PorterEnvGroup).List(context.TODO(), metav1.ListOptions{
		LabelSelector: fmt.Sprintf("%s=%s", LabelKey_Datastore, inp.DatastoreName),
	})
	if err != nil {
		return credential, fmt.Errorf("error retrieving secrets: %s", err.Error())
	}

	if len(secrets.Items) == 0 {
		return credential, fmt.Errorf("datastore secret not found")
	}

	if len(secrets.Items) > 1 {
		return credential, fmt.Errorf("multiple secrets matching the same datastore found")
	}

	secret := secrets.Items[0]

	cmData, err := json.Marshal(cm.Data)
	if err != nil {
		return credential, fmt.Errorf("error marshalling config map data: %w", err)
	}

	secretData, err := json.Marshal(secret.Data)
	if err != nil {
		return credential, fmt.Errorf("error marshalling secret data: %w", err)
	}

	var encodedPassword string
	switch inp.DatastoreType {
	case types.DatastoreType_ElastiCache:
		elastiCacheCredential := &types.ElasticacheCredential{}
		err = json.Unmarshal(cmData, elastiCacheCredential)
		if err != nil {
			return credential, fmt.Errorf("error unmarshalling config map data: %w", err)
		}
		err = json.Unmarshal(secretData, elastiCacheCredential)
		if err != nil {
			return credential, fmt.Errorf("error unmarshalling secret data: %w", err)
		}
		portInt, err := strconv.Atoi(elastiCacheCredential.Port)
		if err != nil {
			return credential, fmt.Errorf("port is not a valid integer")
		}
		credential.Host = elastiCacheCredential.Host
		credential.Port = portInt
		encodedPassword = elastiCacheCredential.Password
	case types.DatastoreType_RDS:
		rdsCredential := &types.RDSCredential{}
		err = json.Unmarshal(cmData, rdsCredential)
		if err != nil {
			return credential, fmt.Errorf("error unmarshalling config map data: %w", err)
		}
		err = json.Unmarshal(secretData, rdsCredential)
		if err != nil {
			return credential, fmt.Errorf("error unmarshalling secret data: %w", err)
		}
		portInt, err := strconv.Atoi(rdsCredential.Port)
		if err != nil {
			return credential, fmt.Errorf("port is not a valid integer")
		}
		if rdsCredential.Username == "" {
			return credential, fmt.Errorf("username not found")
		}
		credential.Host = rdsCredential.Host
		credential.Port = portInt
		credential.Username = rdsCredential.Username
		encodedPassword = rdsCredential.Password
	default:
		return credential, fmt.Errorf("unsupported datastore type")
	}

	decodedPassword, err := base64.StdEncoding.DecodeString(encodedPassword)
	if err != nil {
		return credential, fmt.Errorf("error decoding password: %w", err)
	}
	credential.Password = string(decodedPassword)

	if credential.Host == "" {
		return credential, fmt.Errorf("host not found")
	}
	if credential.Port == 0 {
		return credential, fmt.Errorf("port not found")
	}
	if credential.Password == "" {
		return credential, fmt.Errorf("password not found")
	}

	return credential, nil
}

func printDatastoreConnectionInformation(datastoreType types.DatastoreType, port int, credential types.DatastoreCredential) {
	color.New(color.FgGreen).Println("Secure tunnel setup complete! While the tunnel is running, you can connect to your datastore using the following credentials:")

	switch datastoreType {
	case types.DatastoreType_ElastiCache:
		fmt.Printf(" Host: 127.0.0.1\n")
		fmt.Printf(" Port: %d\n", port)
		fmt.Printf(" Password: %s\n", credential.Password)
		fmt.Println()
		color.New(color.FgGreen).Println("For example, you can connect to your datastore using the following command:")
		fmt.Printf(" redis-cli -p %d -a %s --tls\n", port, credential.Password)
	case types.DatastoreType_RDS:
		fmt.Printf(" Host: 127.0.0.1\n")
		fmt.Printf(" Port: %d\n", port)
		fmt.Printf(" Database name: %s\n", credential.DatabaseName)
		fmt.Printf(" Username: %s\n", credential.Username)
		fmt.Printf(" Password: %s\n", credential.Password)
		color.New(color.FgGreen).Println("For example, you can connect to your datastore using the following command:")
		fmt.Printf(" PGPASSWORD=%s psql -h 127.0.0.1 -p %d -U %s -d %s\n", credential.Password, port, credential.Username, credential.DatabaseName)
	}
	fmt.Println()
}
