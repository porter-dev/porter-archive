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
}

func run(_ *api.AuthCheckResponse, client *api.Client, args []string) error {
	color.New(color.FgGreen).Println("Running", strings.Join(args[1:], " "), "for release", args[0])
	color.New(color.FgGreen).Println("If you don't see a command prompt, try pressing enter.")

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

	restConf, err := getRESTConfig(client)

	if err != nil {
		return fmt.Errorf("Could not retrieve kube credentials: %s", err.Error())
	}

	if existingPod {
		return executeRun(restConf, namespace, selectedPod.Name, selectedContainerName, args[1:])
	}

	return executeRunEphemeral(restConf, namespace, selectedPod.Name, selectedContainerName, args[1:])
}

func getRESTConfig(client *api.Client) (*rest.Config, error) {
	pID := config.Project
	cID := config.Cluster

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

func executeRun(config *rest.Config, namespace, name, container string, args []string) error {
	restClient, err := rest.RESTClientFor(config)

	if err != nil {
		return err
	}

	req := restClient.Post().
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

func executeRunEphemeral(config *rest.Config, namespace, name, container string, args []string) error {
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
		restClient, err := rest.RESTClientFor(config)

		if err != nil {
			return err
		}

		req := restClient.Post().
			Resource("pods").
			Name(podName).
			Namespace("default").
			SubResource("attach")

		req.Param("stdin", "true")
		req.Param("stdout", "true")
		req.Param("tty", "true")
		req.Param("container", container)

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

	for i := 0; i < 5; i++ {
		fmt.Printf("attempting connection %d/5\n", i+1)

		err = t.Safe(fn)

		if err == nil {
			break
		}

		time.Sleep(2 * time.Second)

		// ugly way to catch non-TTY errors, such as when running command "echo \"hello\""
		if i == 4 && err != nil && strings.Contains(err.Error(), "not found in pod") {
			fmt.Printf("Could not open a shell to this container. Container logs:\n")

			err = pipePodLogsToStdout(config, namespace, podName, container, false)
		}
	}

	// delete the ephemeral pod
	deletePod(config, podName, namespace)

	return err
}

func pipePodLogsToStdout(config *rest.Config, namespace, name, container string, follow bool) error {
	podLogOpts := v1.PodLogOptions{
		Container: container,
		Follow:    follow,
	}

	// creates the clientset
	clientset, err := kubernetes.NewForConfig(config)

	if err != nil {
		return err
	}

	req := clientset.CoreV1().Pods(namespace).GetLogs(name, &podLogOpts)

	podLogs, err := req.Stream(
		context.Background(),
	)

	if err != nil {
		return err
	}

	defer podLogs.Close()

	_, err = io.Copy(os.Stdout, podLogs)

	if err != nil {
		return err
	}

	return nil
}

func getExistingPod(config *rest.Config, name, namespace string) (*v1.Pod, error) {
	clientset, err := kubernetes.NewForConfig(config)

	if err != nil {
		return nil, err
	}

	return clientset.CoreV1().Pods(namespace).Get(
		context.Background(),
		name,
		metav1.GetOptions{},
	)
}

func deletePod(config *rest.Config, name, namespace string) error {
	clientset, err := kubernetes.NewForConfig(config)

	if err != nil {
		return err
	}

	return clientset.CoreV1().Pods(namespace).Delete(
		context.Background(),
		name,
		metav1.DeleteOptions{},
	)
}

func createPodFromExisting(config *rest.Config, existing *v1.Pod, args []string) (*v1.Pod, error) {
	clientset, err := kubernetes.NewForConfig(config)

	if err != nil {
		return nil, err
	}

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

	// create the pod and return it
	return clientset.CoreV1().Pods(existing.ObjectMeta.Namespace).Create(
		context.Background(),
		newPod,
		metav1.CreateOptions{},
	)
}
