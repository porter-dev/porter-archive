package cmd

import (
	"context"
	"fmt"
	"io"
	"os"
	"strings"
	"time"

	"github.com/fatih/color"
	"github.com/porter-dev/porter/cli/cmd/api"
	"github.com/porter-dev/porter/cli/cmd/utils"
	"github.com/spf13/cobra"
	v1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/kubectl/pkg/util/term"

	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
	"k8s.io/client-go/tools/remotecommand"
)

var namespace string
var verbose bool

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

var existingPod bool

func init() {
	rootCmd.AddCommand(runCmd)

	runCmd.PersistentFlags().StringVar(
		&namespace,
		"namespace",
		"default",
		"namespace of release to connect to",
	)

	runCmd.PersistentFlags().BoolVarP(
		&existingPod,
		"existing_pod",
		"e",
		false,
		"whether to connect to an existing pod",
	)

	runCmd.PersistentFlags().BoolVarP(
		&verbose,
		"verbose",
		"v",
		false,
		"whether to print verbose output",
	)
}

func run(_ *api.AuthCheckResponse, client *api.Client, args []string) error {
	color.New(color.FgGreen).Println("Running", strings.Join(args[1:], " "), "for release", args[0])

	podsSimple, err := getPods(client, namespace, args[0])

	if err != nil {
		return fmt.Errorf("Could not retrieve list of pods: %s", err.Error())
	}

	// if length of pods is 0, throw error
	var selectedPod podSimple

	if len(podsSimple) == 0 {
		return fmt.Errorf("At least one pod must exist in this deployment.")
	} else if len(podsSimple) == 1 || !existingPod {
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

	if existingPod {
		return executeRun(config, namespace, selectedPod.Name, selectedContainerName, args[1:])
	}

	return executeRunEphemeral(config, namespace, selectedPod.Name, selectedContainerName, args[1:])
}

type PorterRunSharedConfig struct {
	Client     *api.Client
	RestConf   *rest.Config
	Clientset  *kubernetes.Clientset
	RestClient *rest.RESTClient
}

func (p *PorterRunSharedConfig) setSharedConfig() error {
	pID := config.Project
	cID := config.Cluster

	kubeResp, err := p.Client.GetKubeconfig(context.TODO(), pID, cID)

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

	p.RestConf = restConf

	clientset, err := kubernetes.NewForConfig(restConf)

	if err != nil {
		return err
	}

	p.Clientset = clientset

	restClient, err := rest.RESTClientFor(restConf)

	if err != nil {
		return err
	}

	p.RestClient = restClient

	return nil
}

type podSimple struct {
	Name           string
	ContainerNames []string
}

func getPods(client *api.Client, namespace, releaseName string) ([]podSimple, error) {
	pID := config.Project
	cID := config.Cluster

	resp, err := client.GetK8sAllPods(context.TODO(), pID, cID, namespace, releaseName)

	if err != nil {
		return nil, err
	}

	res := make([]podSimple, 0)

	for _, pod := range resp {
		containerNames := make([]string, 0)

		for _, container := range pod.Spec.Containers {
			containerNames = append(containerNames, container.Name)
		}

		res = append(res, podSimple{
			Name:           pod.ObjectMeta.Name,
			ContainerNames: containerNames,
		})
	}

	return res, nil
}

func executeRun(config *PorterRunSharedConfig, namespace, name, container string, args []string) error {
	req := config.RestClient.Post().
		Resource("pods").
		Name(name).
		Namespace(namespace).
		SubResource("exec")

	for _, arg := range args {
		req.Param("command", arg)
	}
	req.Param("stdin", "true")
	req.Param("stdout", "true")
	req.Param("tty", "true")
	req.Param("container", container)

	t := term.TTY{
		In:  os.Stdin,
		Out: os.Stdout,
		Raw: true,
	}

	fn := func() error {
		exec, err := remotecommand.NewSPDYExecutor(config.RestConf, "POST", req.URL())

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

	return nil
}

func executeRunEphemeral(config *PorterRunSharedConfig, namespace, name, container string, args []string) error {
	existing, err := getExistingPod(config, name, namespace)

	if err != nil {
		return err
	}

	newPod, err := createPodFromExisting(config, existing, args)

	if err != nil {
		return err
	}

	podName := newPod.ObjectMeta.Name

	t := term.TTY{
		In:  os.Stdin,
		Out: os.Stdout,
		Raw: true,
	}

	fn := func() error {
		req := config.RestClient.Post().
			Resource("pods").
			Name(podName).
			Namespace("default").
			SubResource("attach")

		req.Param("stdin", "true")
		req.Param("stdout", "true")
		req.Param("tty", "true")
		req.Param("container", container)

		exec, err := remotecommand.NewSPDYExecutor(config.RestConf, "POST", req.URL())

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

	color.New(color.FgYellow).Println("Attempting connection to the container, this may take up to 10 seconds. If you don't see a command prompt, try pressing enter.")

	for i := 0; i < 5; i++ {
		err = t.Safe(fn)

		if err == nil {
			break
		}

		time.Sleep(2 * time.Second)

	}

	// ugly way to catch no TTY errors, such as when running command "echo \"hello\""
	if err != nil {
		color.New(color.FgYellow).Println("Could not open a shell to this container. Container logs:\n")

		var writtenBytes int64

		writtenBytes, err = pipePodLogsToStdout(config, namespace, podName, container, false)

		if verbose || writtenBytes == 0 {
			color.New(color.FgYellow).Println("Could not get logs. Pod events:\n")

			err = pipeEventsToStdout(config, namespace, podName, container, false)
		}
	} else if verbose {
		color.New(color.FgYellow).Println("Pod events:\n")

		pipeEventsToStdout(config, namespace, podName, container, false)
	}

	// delete the ephemeral pod
	deletePod(config, podName, namespace)

	return err
}

func pipePodLogsToStdout(config *PorterRunSharedConfig, namespace, name, container string, follow bool) (int64, error) {
	podLogOpts := v1.PodLogOptions{
		Container: container,
		Follow:    follow,
	}

	req := config.Clientset.CoreV1().Pods(namespace).GetLogs(name, &podLogOpts)

	podLogs, err := req.Stream(
		context.Background(),
	)

	if err != nil {
		return 0, err
	}

	defer podLogs.Close()

	return io.Copy(os.Stdout, podLogs)
}

func pipeEventsToStdout(config *PorterRunSharedConfig, namespace, name, container string, follow bool) error {
	// update the config in case the operation has taken longer than token expiry time
	config.setSharedConfig()

	// creates the clientset
	resp, err := config.Clientset.CoreV1().Events(namespace).List(
		context.TODO(),
		metav1.ListOptions{
			FieldSelector: fmt.Sprintf("involvedObject.name=%s,involvedObject.namespace=%s", name, namespace),
		},
	)

	if err != nil {
		return err
	}

	for _, event := range resp.Items {
		color.New(color.FgRed).Println(event.Message)
	}

	return nil
}

func getExistingPod(config *PorterRunSharedConfig, name, namespace string) (*v1.Pod, error) {
	return config.Clientset.CoreV1().Pods(namespace).Get(
		context.Background(),
		name,
		metav1.GetOptions{},
	)
}

func deletePod(config *PorterRunSharedConfig, name, namespace string) error {
	// update the config in case the operation has taken longer than token expiry time
	config.setSharedConfig()

	err := config.Clientset.CoreV1().Pods(namespace).Delete(
		context.Background(),
		name,
		metav1.DeleteOptions{},
	)

	if err != nil {
		color.New(color.FgRed).Println("Could not delete ephemeral pod: %s", err.Error())
		return err
	}

	color.New(color.FgGreen).Println("Sucessfully deleted ephemeral pod")

	return nil
}

func createPodFromExisting(config *PorterRunSharedConfig, existing *v1.Pod, args []string) (*v1.Pod, error) {
	newPod := existing.DeepCopy()

	// only copy the pod spec, overwrite metadata
	newPod.ObjectMeta = metav1.ObjectMeta{
		Name:      strings.ToLower(fmt.Sprintf("%s-copy-%s", existing.ObjectMeta.Name, utils.String(4))),
		Namespace: existing.ObjectMeta.Namespace,
	}

	newPod.Status = v1.PodStatus{}

	// set restart policy to never
	newPod.Spec.RestartPolicy = v1.RestartPolicyNever

	// change the command in the pod to the passed in pod command
	cmdRoot := args[0]
	cmdArgs := make([]string, 0)

	if len(args) > 1 {
		cmdArgs = args[1:]
	}

	newPod.Spec.Containers[0].Command = []string{cmdRoot}
	newPod.Spec.Containers[0].Args = cmdArgs
	newPod.Spec.Containers[0].TTY = true
	newPod.Spec.Containers[0].Stdin = true
	newPod.Spec.Containers[0].StdinOnce = true
	newPod.Spec.NodeName = ""

	// create the pod and return it
	return config.Clientset.CoreV1().Pods(existing.ObjectMeta.Namespace).Create(
		context.Background(),
		newPod,
		metav1.CreateOptions{},
	)
}
