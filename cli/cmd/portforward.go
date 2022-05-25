package cmd

import (
	"context"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"time"

	"github.com/briandowns/spinner"
	api "github.com/porter-dev/porter/api/client"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/cli/cmd/utils"
	"github.com/spf13/cobra"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/util/sets"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
	"k8s.io/client-go/tools/portforward"
	"k8s.io/client-go/transport/spdy"
	"k8s.io/kubectl/pkg/util"
)

var address []string

var portForwardCmd = &cobra.Command{
	Use:   "port-forward [release] [LOCAL_PORT:]REMOTE_PORT [...[LOCAL_PORT_N:]REMOTE_PORT_N]",
	Short: "Forward one or more local ports to a pod of a release",
	Args:  cobra.MinimumNArgs(2),
	Run: func(cmd *cobra.Command, args []string) {
		err := checkLoginAndRun(args, portForward)

		if err != nil {
			os.Exit(1)
		}
	},
}

func init() {
	portForwardCmd.PersistentFlags().StringVar(
		&namespace,
		"namespace",
		"default",
		"namespace of the release whose pod you want to port-forward to",
	)

	portForwardCmd.Flags().StringSliceVar(
		&address,
		"address",
		[]string{"localhost"},
		"Addresses to listen on (comma separated). Only accepts IP addresses or localhost as a value. "+
			"When localhost is supplied, kubectl will try  to bind on both 127.0.0.1 and ::1 and will fail "+
			"if neither of these addresses are available to bind.")

	rootCmd.AddCommand(portForwardCmd)
}

func forwardPorts(
	method string,
	url *url.URL,
	kubeConfig *rest.Config,
	address, ports []string,
	stopChan <-chan struct{},
	readyChan chan struct{},
) error {
	transport, upgrader, err := spdy.RoundTripperFor(kubeConfig)

	if err != nil {
		return err
	}

	dialer := spdy.NewDialer(upgrader, &http.Client{Transport: transport}, method, url)
	fw, err := portforward.NewOnAddresses(
		dialer, address, ports, stopChan, readyChan, os.Stdout, os.Stderr)

	if err != nil {
		return err
	}

	return fw.ForwardPorts()
}

// splitPort splits port string which is in form of [LOCAL PORT]:REMOTE PORT
// and returns local and remote ports separately
func splitPort(port string) (local, remote string) {
	parts := strings.Split(port, ":")
	if len(parts) == 2 {
		return parts[0], parts[1]
	}

	return parts[0], parts[0]
}

func portForward(user *types.GetAuthenticatedUserResponse, client *api.Client, args []string) error {
	var err error
	var pod corev1.Pod

	s := spinner.New(spinner.CharSets[9], 100*time.Millisecond)
	s.Color("cyan")
	s.Suffix = fmt.Sprintf(" Loading list of pods for %s", args[0])
	s.Start()

	podsResp, err := client.GetK8sAllPods(context.Background(), cliConf.Project, cliConf.Cluster, namespace, args[0])

	s.Stop()

	if err != nil {
		return err
	}

	pods := *podsResp

	if len(pods) > 1 {
		selectedPod, err := utils.PromptSelect("Select a pod to port-forward", func() []string {
			var names []string

			for i, pod := range pods {
				names = append(names, fmt.Sprintf("%d - %s", (i+1), pod.Name))
			}

			return names
		}())

		if err != nil {
			return err
		}

		podIdxStr := strings.Split(selectedPod, " - ")[0]

		podIdx, err := strconv.Atoi(podIdxStr)

		if err != nil {
			return err
		}

		pod = pods[podIdx-1]
	} else {
		pod = pods[0]
	}

	kubeResp, err := client.GetKubeconfig(context.Background(), cliConf.Project, cliConf.Cluster)

	if err != nil {
		return err
	}

	kubeBytes := kubeResp.Kubeconfig

	cmdConf, err := clientcmd.NewClientConfigFromBytes(kubeBytes)

	if err != nil {
		return err
	}

	restConf, err := cmdConf.ClientConfig()

	if err != nil {
		return err
	}

	restConf.GroupVersion = &schema.GroupVersion{
		Group:   "api",
		Version: "v1",
	}

	restConf.NegotiatedSerializer = runtime.NewSimpleNegotiatedSerializer(runtime.SerializerInfo{})

	restClient, err := rest.RESTClientFor(restConf)

	if err != nil {
		return err
	}

	err = checkUDPPortInPod(args[1:], &pod)

	if err != nil {
		return err
	}

	ports, err := convertPodNamedPortToNumber(args[1:], pod)

	if err != nil {
		return err
	}

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

	req := restClient.Post().
		Resource("pods").
		Namespace(namespace).
		Name(pod.Name).
		SubResource("portforward")

	return forwardPorts("POST", req.URL(), restConf, address, ports, stopChannel, readyChannel)
}

func checkUDPPortInPod(ports []string, pod *corev1.Pod) error {
	udpPorts := sets.NewInt()
	tcpPorts := sets.NewInt()
	for _, ct := range pod.Spec.Containers {
		for _, ctPort := range ct.Ports {
			portNum := int(ctPort.ContainerPort)
			switch ctPort.Protocol {
			case corev1.ProtocolUDP:
				udpPorts.Insert(portNum)
			case corev1.ProtocolTCP:
				tcpPorts.Insert(portNum)
			}
		}
	}
	return checkUDPPorts(udpPorts.Difference(tcpPorts), ports, pod)
}

func checkUDPPorts(udpOnlyPorts sets.Int, ports []string, obj metav1.Object) error {
	for _, port := range ports {
		_, remotePort := splitPort(port)
		portNum, err := strconv.Atoi(remotePort)
		if err != nil {
			switch v := obj.(type) {
			case *corev1.Service:
				svcPort, err := util.LookupServicePortNumberByName(*v, remotePort)
				if err != nil {
					return err
				}
				portNum = int(svcPort)

			case *corev1.Pod:
				ctPort, err := util.LookupContainerPortNumberByName(*v, remotePort)
				if err != nil {
					return err
				}
				portNum = int(ctPort)

			default:
				return fmt.Errorf("unknown object: %v", obj)
			}
		}
		if udpOnlyPorts.Has(portNum) {
			return fmt.Errorf("UDP protocol is not supported for %s", remotePort)
		}
	}
	return nil
}

func convertPodNamedPortToNumber(ports []string, pod corev1.Pod) ([]string, error) {
	var converted []string
	for _, port := range ports {
		localPort, remotePort := splitPort(port)

		containerPortStr := remotePort
		_, err := strconv.Atoi(remotePort)
		if err != nil {
			containerPort, err := util.LookupContainerPortNumberByName(pod, remotePort)
			if err != nil {
				return nil, err
			}

			containerPortStr = strconv.Itoa(int(containerPort))
		}

		if localPort != remotePort {
			converted = append(converted, fmt.Sprintf("%s:%s", localPort, containerPortStr))
		} else {
			converted = append(converted, containerPortStr)
		}
	}

	return converted, nil
}
