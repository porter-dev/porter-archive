package cmd

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"strings"
	"time"

	"github.com/fatih/color"
	api "github.com/porter-dev/porter/api/client"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/cli/cmd/utils"
	"github.com/spf13/cobra"
	batchv1 "k8s.io/api/batch/v1"
	v1 "k8s.io/api/core/v1"
	rbacv1 "k8s.io/api/rbac/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/fields"
	"k8s.io/apimachinery/pkg/watch"
	"k8s.io/kubectl/pkg/util/term"

	templaterUtils "github.com/porter-dev/porter/internal/templater/utils"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
	"k8s.io/client-go/tools/remotecommand"
)

var (
	appNamespace     string
	appVerbose       bool
	appExistingPod   bool
	appInteractive   bool
	appContainerName string
	appTag           string
)

// appCmd represents the "porter app" base command when called
// without any subcommands
var appCmd = &cobra.Command{
	Use:   "app",
	Short: "Runs a command for your application.",
}

// appRunCmd represents the "porter app run" subcommand
var appRunCmd = &cobra.Command{
	Use:   "run [application] -- COMMAND [args...]",
	Args:  cobra.MinimumNArgs(2),
	Short: "Runs a command inside a connected cluster container.",
	Run: func(cmd *cobra.Command, args []string) {
		err := checkLoginAndRun(args, appRun)
		if err != nil {
			os.Exit(1)
		}
	},
}

// appRunCleanupCmd represents the "porter app run cleanup" subcommand
var appRunCleanupCmd = &cobra.Command{
	Use:   "cleanup",
	Args:  cobra.NoArgs,
	Short: "Delete any lingering ephemeral pods that were created with \"porter app run\".",
	Run: func(cmd *cobra.Command, args []string) {
		err := checkLoginAndRun(args, appCleanup)
		if err != nil {
			os.Exit(1)
		}
	},
}

// appUpdateTagCmd represents the "porter app update-tag" subcommand
var appUpdateTagCmd = &cobra.Command{
	Use:   "update-tag [application]",
	Args:  cobra.MinimumNArgs(1),
	Short: "Updates the image tag for an application.",
	Run: func(cmd *cobra.Command, args []string) {
		err := checkLoginAndRun(args, appUpdateTag)
		if err != nil {
			os.Exit(1)
		}
	},
}

func init() {
	rootCmd.AddCommand(appCmd)

	appRunCmd.PersistentFlags().BoolVarP(
		&appExistingPod,
		"existing_pod",
		"e",
		false,
		"whether to connect to an existing pod (default false)",
	)

	appRunCmd.PersistentFlags().BoolVarP(
		&appVerbose,
		"verbose",
		"v",
		false,
		"whether to print verbose output",
	)

	appRunCmd.PersistentFlags().BoolVar(
		&appInteractive,
		"interactive",
		false,
		"whether to run in interactive mode (default false)",
	)

	appRunCmd.PersistentFlags().StringVarP(
		&appContainerName,
		"container",
		"c",
		"",
		"name of the container inside pod to run the command in",
	)
	appRunCmd.AddCommand(appRunCleanupCmd)

	appUpdateTagCmd.PersistentFlags().StringVarP(
		&appTag,
		"tag",
		"t",
		"",
		"the specified tag to use, default is \"latest\"",
	)
	appCmd.AddCommand(appRunCmd)
	appCmd.AddCommand(appUpdateTagCmd)
}

func appRun(_ *types.GetAuthenticatedUserResponse, client *api.Client, args []string) error {
	execArgs := args[1:]

	color.New(color.FgGreen).Println("Running", strings.Join(execArgs, " "), "for application", args[0])

	appNamespace = fmt.Sprintf("porter-stack-%s", args[0])

	if len(execArgs) > 0 {
		res, err := client.GetPorterApp(context.Background(), cliConf.Project, cliConf.Cluster, args[0])
		if err != nil {
			return fmt.Errorf("Unable to run command - application not found: %w", err)
		}

		if res.Builder != "" &&
			(strings.Contains(res.Builder, "heroku") ||
				strings.Contains(res.Builder, "paketo")) &&
			execArgs[0] != "/cnb/lifecycle/launcher" &&
			execArgs[0] != "launcher" {
			// this is a buildpacks release using a heroku builder, prepend the launcher
			execArgs = append([]string{"/cnb/lifecycle/launcher"}, execArgs...)
		}
	}

	podsSimple, err := appGetPods(client, appNamespace, args[0])
	if err != nil {
		return fmt.Errorf("Could not retrieve list of pods: %s", err.Error())
	}

	// if length of pods is 0, throw error
	var selectedPod appPodSimple

	if len(podsSimple) == 0 {
		return fmt.Errorf("At least one pod must exist in this deployment.")
	} else if !appInteractive || len(podsSimple) == 1 {
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

	if len(selectedPod.ContainerNames) == 0 {
		return fmt.Errorf("At least one container must exist in the selected pod.")
	} else if len(selectedPod.ContainerNames) == 1 {
		if appContainerName != "" && appContainerName != selectedPod.ContainerNames[0] {
			return fmt.Errorf("provided container %s does not exist in pod %s", appContainerName, selectedPod.Name)
		}

		selectedContainerName = selectedPod.ContainerNames[0]
	}

	if appContainerName != "" && selectedContainerName == "" {
		// check if provided container name exists in the pod
		for _, name := range selectedPod.ContainerNames {
			if name == appContainerName {
				selectedContainerName = name
				break
			}
		}

		if selectedContainerName == "" {
			return fmt.Errorf("provided container %s does not exist in pod %s", appContainerName, selectedPod.Name)
		}
	}

	if selectedContainerName == "" {
		if !appInteractive {
			return fmt.Errorf("container name must be specified using the --container flag when not using interactive mode")
		}

		selectedContainer, err := utils.PromptSelect("Select the container:", selectedPod.ContainerNames)
		if err != nil {
			return err
		}

		selectedContainerName = selectedContainer
	}

	config := &AppPorterRunSharedConfig{
		Client: client,
	}

	err = config.setSharedConfig()

	if err != nil {
		return fmt.Errorf("Could not retrieve kube credentials: %s", err.Error())
	}

	if appExistingPod {
		return appExecuteRun(config, appNamespace, selectedPod.Name, selectedContainerName, execArgs)
	}

	return appExecuteRunEphemeral(config, appNamespace, selectedPod.Name, selectedContainerName, execArgs)
}

func appCleanup(_ *types.GetAuthenticatedUserResponse, client *api.Client, _ []string) error {
	config := &AppPorterRunSharedConfig{
		Client: client,
	}

	err := config.setSharedConfig()
	if err != nil {
		return fmt.Errorf("Could not retrieve kube credentials: %s", err.Error())
	}

	proceed, err := utils.PromptSelect(
		fmt.Sprintf("You have chosen the '%s' namespace for cleanup. Do you want to proceed?", appNamespace),
		[]string{"Yes", "No", "All namespaces"},
	)
	if err != nil {
		return err
	}

	if proceed == "No" {
		return nil
	}

	var podNames []string

	color.New(color.FgGreen).Println("Fetching ephemeral pods for cleanup")

	if proceed == "All namespaces" {
		namespaces, err := config.Clientset.CoreV1().Namespaces().List(context.Background(), metav1.ListOptions{})
		if err != nil {
			return err
		}

		for _, namespace := range namespaces.Items {
			if pods, err := appGetEphemeralPods(namespace.Name, config.Clientset); err == nil {
				podNames = append(podNames, pods...)
			} else {
				return err
			}
		}
	} else {
		if pods, err := appGetEphemeralPods(appNamespace, config.Clientset); err == nil {
			podNames = append(podNames, pods...)
		} else {
			return err
		}
	}

	if len(podNames) == 0 {
		color.New(color.FgBlue).Println("No ephemeral pods to delete")
		return nil
	}

	selectedPods, err := utils.PromptMultiselect("Select ephemeral pods to delete", podNames)
	if err != nil {
		return err
	}

	for _, podName := range selectedPods {
		color.New(color.FgBlue).Printf("Deleting ephemeral pod: %s\n", podName)

		err = config.Clientset.CoreV1().Pods(appNamespace).Delete(
			context.Background(), podName, metav1.DeleteOptions{},
		)
		if err != nil {
			return err
		}
	}

	return nil
}

func appGetEphemeralPods(namespace string, clientset *kubernetes.Clientset) ([]string, error) {
	var podNames []string

	pods, err := clientset.CoreV1().Pods(namespace).List(
		context.Background(), metav1.ListOptions{LabelSelector: "porter/ephemeral-pod"},
	)
	if err != nil {
		return nil, err
	}

	for _, pod := range pods.Items {
		podNames = append(podNames, pod.Name)
	}

	return podNames, nil
}

type AppPorterRunSharedConfig struct {
	Client     *api.Client
	RestConf   *rest.Config
	Clientset  *kubernetes.Clientset
	RestClient *rest.RESTClient
}

func (p *AppPorterRunSharedConfig) setSharedConfig() error {
	pID := cliConf.Project
	cID := cliConf.Cluster

	kubeResp, err := p.Client.GetKubeconfig(context.Background(), pID, cID, cliConf.Kubeconfig)
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

type appPodSimple struct {
	Name           string
	ContainerNames []string
}

func appGetPods(client *api.Client, namespace, releaseName string) ([]appPodSimple, error) {
	pID := cliConf.Project
	cID := cliConf.Cluster

	resp, err := client.GetK8sAllPods(context.TODO(), pID, cID, namespace, releaseName)
	if err != nil {
		return nil, err
	}

	pods := *resp

	res := make([]appPodSimple, 0)

	for _, pod := range pods {
		if pod.Status.Phase == v1.PodRunning {
			containerNames := make([]string, 0)

			for _, container := range pod.Spec.Containers {
				containerNames = append(containerNames, container.Name)
			}

			res = append(res, appPodSimple{
				Name:           pod.ObjectMeta.Name,
				ContainerNames: containerNames,
			})
		}
	}

	return res, nil
}

func appExecuteRun(config *AppPorterRunSharedConfig, namespace, name, container string, args []string) error {
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
	size := t.GetSize()
	sizeQueue := t.MonitorSize(size)

	return t.Safe(func() error {
		exec, err := remotecommand.NewSPDYExecutor(config.RestConf, "POST", req.URL())
		if err != nil {
			return err
		}

		return exec.Stream(remotecommand.StreamOptions{
			Stdin:  os.Stdin,
			Stdout: os.Stdout,
			Stderr: os.Stderr,
			Tty:    true,

			TerminalSizeQueue: sizeQueue,
		})
	})
}

func appExecuteRunEphemeral(config *AppPorterRunSharedConfig, namespace, name, container string, args []string) error {
	existing, err := appGetExistingPod(config, name, namespace)
	if err != nil {
		return err
	}

	newPod, err := appCreateEphemeralPodFromExisting(config, existing, container, args)
	if err != nil {
		return err
	}
	podName := newPod.ObjectMeta.Name

	// delete the ephemeral pod no matter what
	defer appDeletePod(config, podName, namespace)

	color.New(color.FgYellow).Printf("Waiting for pod %s to be ready...", podName)
	if err = appWaitForPod(config, newPod); err != nil {
		color.New(color.FgRed).Println("failed")
		return appHandlePodAttachError(err, config, namespace, podName, container)
	}

	err = appCheckForPodDeletionCronJob(config)
	if err != nil {
		return err
	}

	// refresh pod info for latest status
	newPod, err = config.Clientset.CoreV1().
		Pods(newPod.Namespace).
		Get(context.Background(), newPod.Name, metav1.GetOptions{})

	// pod exited while we were waiting.  maybe an error maybe not.
	// we dont know if the user wanted an interactive shell or not.
	// if it was an error the logs hopefully say so.
	if appIsPodExited(newPod) {
		color.New(color.FgGreen).Println("complete!")
		var writtenBytes int64
		writtenBytes, _ = appPipePodLogsToStdout(config, namespace, podName, container, false)

		if appVerbose || writtenBytes == 0 {
			color.New(color.FgYellow).Println("Could not get logs. Pod events:")
			appPipeEventsToStdout(config, namespace, podName, container, false)
		}
		return nil
	}
	color.New(color.FgGreen).Println("ready!")

	color.New(color.FgYellow).Println("Attempting connection to the container. If you don't see a command prompt, try pressing enter.")
	req := config.RestClient.Post().
		Resource("pods").
		Name(podName).
		Namespace(namespace).
		SubResource("attach")

	req.Param("stdin", "true")
	req.Param("stdout", "true")
	req.Param("tty", "true")
	req.Param("container", container)

	t := term.TTY{
		In:  os.Stdin,
		Out: os.Stdout,
		Raw: true,
	}
	size := t.GetSize()
	sizeQueue := t.MonitorSize(size)

	if err = t.Safe(func() error {
		exec, err := remotecommand.NewSPDYExecutor(config.RestConf, "POST", req.URL())
		if err != nil {
			return err
		}
		return exec.Stream(remotecommand.StreamOptions{
			Stdin:  os.Stdin,
			Stdout: os.Stdout,
			Stderr: os.Stderr,
			Tty:    true,

			TerminalSizeQueue: sizeQueue,
		})
	}); err != nil {
		// ugly way to catch no TTY errors, such as when running command "echo \"hello\""
		return appHandlePodAttachError(err, config, namespace, podName, container)
	}

	if appVerbose {
		color.New(color.FgYellow).Println("Pod events:")
		appPipeEventsToStdout(config, namespace, podName, container, false)
	}

	return err
}

func appCheckForPodDeletionCronJob(config *AppPorterRunSharedConfig) error {
	// try and create the cron job and all of the other required resources as necessary,
	// starting with the service account, then role and then a role binding

	err := appCheckForServiceAccount(config)
	if err != nil {
		return err
	}

	err = appCheckForClusterRole(config)
	if err != nil {
		return err
	}

	err = appCheckForRoleBinding(config)
	if err != nil {
		return err
	}

	namespaces, err := config.Clientset.CoreV1().Namespaces().List(context.Background(), metav1.ListOptions{})
	if err != nil {
		return err
	}

	for _, namespace := range namespaces.Items {
		cronJobs, err := config.Clientset.BatchV1().CronJobs(namespace.Name).List(
			context.Background(), metav1.ListOptions{},
		)
		if err != nil {
			return err
		}

		if namespace.Name == "default" {
			for _, cronJob := range cronJobs.Items {
				if cronJob.Name == "porter-ephemeral-pod-deletion-cronjob" {
					return nil
				}
			}
		} else {
			for _, cronJob := range cronJobs.Items {
				if cronJob.Name == "porter-ephemeral-pod-deletion-cronjob" {
					err = config.Clientset.BatchV1().CronJobs(namespace.Name).Delete(
						context.Background(), cronJob.Name, metav1.DeleteOptions{},
					)
					if err != nil {
						return err
					}
				}
			}
		}
	}

	// create the cronjob

	cronJob := &batchv1.CronJob{
		ObjectMeta: metav1.ObjectMeta{
			Name: "porter-ephemeral-pod-deletion-cronjob",
		},
		Spec: batchv1.CronJobSpec{
			Schedule: "0 * * * *",
			JobTemplate: batchv1.JobTemplateSpec{
				Spec: batchv1.JobSpec{
					Template: v1.PodTemplateSpec{
						Spec: v1.PodSpec{
							ServiceAccountName: "porter-ephemeral-pod-deletion-service-account",
							RestartPolicy:      v1.RestartPolicyNever,
							Containers: []v1.Container{
								{
									Name:            "ephemeral-pods-manager",
									Image:           "public.ecr.aws/o1j4x7p4/porter-ephemeral-pods-manager:latest",
									ImagePullPolicy: v1.PullAlways,
									Args:            []string{"delete"},
								},
							},
						},
					},
				},
			},
		},
	}
	_, err = config.Clientset.BatchV1().CronJobs("default").Create(
		context.Background(), cronJob, metav1.CreateOptions{},
	)
	if err != nil {
		return err
	}

	return nil
}

func appCheckForServiceAccount(config *AppPorterRunSharedConfig) error {
	namespaces, err := config.Clientset.CoreV1().Namespaces().List(context.Background(), metav1.ListOptions{})
	if err != nil {
		return err
	}

	for _, namespace := range namespaces.Items {
		serviceAccounts, err := config.Clientset.CoreV1().ServiceAccounts(namespace.Name).List(
			context.Background(), metav1.ListOptions{},
		)
		if err != nil {
			return err
		}

		if namespace.Name == "default" {
			for _, svcAccount := range serviceAccounts.Items {
				if svcAccount.Name == "porter-ephemeral-pod-deletion-service-account" {
					return nil
				}
			}
		} else {
			for _, svcAccount := range serviceAccounts.Items {
				if svcAccount.Name == "porter-ephemeral-pod-deletion-service-account" {
					err = config.Clientset.CoreV1().ServiceAccounts(namespace.Name).Delete(
						context.Background(), svcAccount.Name, metav1.DeleteOptions{},
					)
					if err != nil {
						return err
					}
				}
			}
		}
	}

	serviceAccount := &v1.ServiceAccount{
		ObjectMeta: metav1.ObjectMeta{
			Name: "porter-ephemeral-pod-deletion-service-account",
		},
	}
	_, err = config.Clientset.CoreV1().ServiceAccounts("default").Create(
		context.Background(), serviceAccount, metav1.CreateOptions{},
	)
	if err != nil {
		return err
	}

	return nil
}

func appCheckForClusterRole(config *AppPorterRunSharedConfig) error {
	roles, err := config.Clientset.RbacV1().ClusterRoles().List(
		context.Background(), metav1.ListOptions{},
	)
	if err != nil {
		return err
	}

	for _, role := range roles.Items {
		if role.Name == "porter-ephemeral-pod-deletion-cluster-role" {
			return nil
		}
	}

	role := &rbacv1.ClusterRole{
		ObjectMeta: metav1.ObjectMeta{
			Name: "porter-ephemeral-pod-deletion-cluster-role",
		},
		Rules: []rbacv1.PolicyRule{
			{
				APIGroups: []string{""},
				Resources: []string{"pods"},
				Verbs:     []string{"list", "delete"},
			},
			{
				APIGroups: []string{""},
				Resources: []string{"namespaces"},
				Verbs:     []string{"list"},
			},
		},
	}
	_, err = config.Clientset.RbacV1().ClusterRoles().Create(
		context.Background(), role, metav1.CreateOptions{},
	)
	if err != nil {
		return err
	}

	return nil
}

func appCheckForRoleBinding(config *AppPorterRunSharedConfig) error {
	bindings, err := config.Clientset.RbacV1().ClusterRoleBindings().List(
		context.Background(), metav1.ListOptions{},
	)
	if err != nil {
		return err
	}

	for _, binding := range bindings.Items {
		if binding.Name == "porter-ephemeral-pod-deletion-cluster-rolebinding" {
			return nil
		}
	}

	binding := &rbacv1.ClusterRoleBinding{
		ObjectMeta: metav1.ObjectMeta{
			Name: "porter-ephemeral-pod-deletion-cluster-rolebinding",
		},
		RoleRef: rbacv1.RoleRef{
			APIGroup: "rbac.authorization.k8s.io",
			Kind:     "ClusterRole",
			Name:     "porter-ephemeral-pod-deletion-cluster-role",
		},
		Subjects: []rbacv1.Subject{
			{
				APIGroup:  "",
				Kind:      "ServiceAccount",
				Name:      "porter-ephemeral-pod-deletion-service-account",
				Namespace: "default",
			},
		},
	}
	_, err = config.Clientset.RbacV1().ClusterRoleBindings().Create(
		context.Background(), binding, metav1.CreateOptions{},
	)
	if err != nil {
		return err
	}

	return nil
}

func appWaitForPod(config *AppPorterRunSharedConfig, pod *v1.Pod) error {
	var (
		w   watch.Interface
		err error
		ok  bool
	)
	// immediately after creating a pod, the API may return a 404. heuristically 1
	// second seems to be plenty.
	watchRetries := 3
	for i := 0; i < watchRetries; i++ {
		selector := fields.OneTermEqualSelector("metadata.name", pod.Name).String()
		w, err = config.Clientset.CoreV1().
			Pods(pod.Namespace).
			Watch(context.Background(), metav1.ListOptions{FieldSelector: selector})

		if err == nil {
			break
		}
		time.Sleep(time.Second)
	}
	if err != nil {
		return err
	}
	defer w.Stop()
	for {
		select {
		case <-time.Tick(time.Second):
			// poll every second in case we already missed the ready event while
			// creating the listener.
			pod, err = config.Clientset.CoreV1().
				Pods(pod.Namespace).
				Get(context.Background(), pod.Name, metav1.GetOptions{})
			if appIsPodReady(pod) || appIsPodExited(pod) {
				return nil
			}
		case evt := <-w.ResultChan():
			pod, ok = evt.Object.(*v1.Pod)
			if !ok {
				return fmt.Errorf("unexpected object type: %T", evt.Object)
			}
			if appIsPodReady(pod) || appIsPodExited(pod) {
				return nil
			}
		case <-time.After(time.Second * 10):
			return errors.New("timed out waiting for pod")
		}
	}
}

func appIsPodReady(pod *v1.Pod) bool {
	ready := false
	conditions := pod.Status.Conditions
	for i := range conditions {
		if conditions[i].Type == v1.PodReady {
			ready = pod.Status.Conditions[i].Status == v1.ConditionTrue
		}
	}
	return ready
}

func appIsPodExited(pod *v1.Pod) bool {
	return pod.Status.Phase == v1.PodSucceeded || pod.Status.Phase == v1.PodFailed
}

func appHandlePodAttachError(err error, config *AppPorterRunSharedConfig, namespace, podName, container string) error {
	if appVerbose {
		color.New(color.FgYellow).Fprintf(os.Stderr, "Error: %s\n", err)
	}
	color.New(color.FgYellow).Fprintln(os.Stderr, "Could not open a shell to this container. Container logs:")

	var writtenBytes int64
	writtenBytes, _ = appPipePodLogsToStdout(config, namespace, podName, container, false)

	if appVerbose || writtenBytes == 0 {
		color.New(color.FgYellow).Fprintln(os.Stderr, "Could not get logs. Pod events:")
		appPipeEventsToStdout(config, namespace, podName, container, false)
	}
	return err
}

func appPipePodLogsToStdout(config *AppPorterRunSharedConfig, namespace, name, container string, follow bool) (int64, error) {
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

func appPipeEventsToStdout(config *AppPorterRunSharedConfig, namespace, name, container string, follow bool) error {
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

func appGetExistingPod(config *AppPorterRunSharedConfig, name, namespace string) (*v1.Pod, error) {
	return config.Clientset.CoreV1().Pods(namespace).Get(
		context.Background(),
		name,
		metav1.GetOptions{},
	)
}

func appDeletePod(config *AppPorterRunSharedConfig, name, namespace string) error {
	// update the config in case the operation has taken longer than token expiry time
	config.setSharedConfig()

	err := config.Clientset.CoreV1().Pods(namespace).Delete(
		context.Background(),
		name,
		metav1.DeleteOptions{},
	)
	if err != nil {
		color.New(color.FgRed).Fprintf(os.Stderr, "Could not delete ephemeral pod: %s\n", err.Error())
		return err
	}

	color.New(color.FgGreen).Println("Sucessfully deleted ephemeral pod")

	return nil
}

func appCreateEphemeralPodFromExisting(
	config *AppPorterRunSharedConfig,
	existing *v1.Pod,
	container string,
	args []string,
) (*v1.Pod, error) {
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

	// annotate with the ephemeral pod tag
	newPod.Labels = make(map[string]string)
	newPod.Labels["porter/ephemeral-pod"] = "true"

	if len(args) > 1 {
		cmdArgs = args[1:]
	}

	for i := 0; i < len(newPod.Spec.Containers); i++ {
		if newPod.Spec.Containers[i].Name == container {
			newPod.Spec.Containers[i].Command = []string{cmdRoot}
			newPod.Spec.Containers[i].Args = cmdArgs
			newPod.Spec.Containers[i].TTY = true
			newPod.Spec.Containers[i].Stdin = true
			newPod.Spec.Containers[i].StdinOnce = true

			if newPod.Spec.Containers[i].Resources.Requests.Cpu().MilliValue() > 500 {
				newPod.Spec.Containers[i].Resources.Limits[v1.ResourceCPU] = resource.MustParse("500m")
				newPod.Spec.Containers[i].Resources.Requests[v1.ResourceCPU] = resource.MustParse("500m")

				for j := 0; j < len(newPod.Spec.Containers[i].Env); j++ {
					if newPod.Spec.Containers[i].Env[j].Name == "PORTER_RESOURCES_CPU" {
						newPod.Spec.Containers[i].Env[j].Value = "500m"
						break
					}
				}
			}

			if newPod.Spec.Containers[i].Resources.Requests.Memory().Value() > 1000*1024*1024 {
				newPod.Spec.Containers[i].Resources.Limits[v1.ResourceMemory] = resource.MustParse("1000Mi")
				newPod.Spec.Containers[i].Resources.Requests[v1.ResourceMemory] = resource.MustParse("1000Mi")

				for j := 0; j < len(newPod.Spec.Containers[i].Env); j++ {
					if newPod.Spec.Containers[i].Env[j].Name == "PORTER_RESOURCES_RAM" {
						newPod.Spec.Containers[i].Env[j].Value = "1000Mi"
						break
					}
				}
			}
		}

		// remove health checks and probes
		newPod.Spec.Containers[i].LivenessProbe = nil
		newPod.Spec.Containers[i].ReadinessProbe = nil
		newPod.Spec.Containers[i].StartupProbe = nil
	}

	newPod.Spec.NodeName = ""

	// create the pod and return it
	return config.Clientset.CoreV1().Pods(existing.ObjectMeta.Namespace).Create(
		context.Background(),
		newPod,
		metav1.CreateOptions{},
	)
}

func appUpdateTag(_ *types.GetAuthenticatedUserResponse, client *api.Client, args []string) error {
	namespace := fmt.Sprintf("porter-stack-%s", args[0])
	if appTag == "" {
		appTag = "latest"
	}
	release, err := client.GetRelease(context.TODO(), cliConf.Project, cliConf.Cluster, namespace, args[0])
	if err != nil {
		return fmt.Errorf("Unable to find application %s", args[0])
	}

	// check for the post-deploy job associated with the release
	postDeployReleaseName := fmt.Sprintf("%s-r", args[0])
	postDeployRelease, postDeployReleaseErr := client.GetRelease(context.TODO(), cliConf.Project, cliConf.Cluster, namespace, postDeployReleaseName)

	color.New(color.FgGreen).Printf("Updating application %s to build using tag \"%s\"\n", args[0], appTag)
	overrideValues := map[string]interface{}{
		"global": map[string]interface{}{
			"image": map[string]interface{}{
				"tag": appTag,
			},
		},
	}
	mergedValues := templaterUtils.CoalesceValues(release.Config, overrideValues)

	bytes, err := json.Marshal(mergedValues)
	if err != nil {
		return fmt.Errorf("Unable to update application %s: %w", args[0], err)
	}
	err = client.UpgradeRelease(
		context.Background(),
		cliConf.Project,
		cliConf.Cluster,
		namespace,
		args[0],
		&types.UpgradeReleaseRequest{
			Values:             string(bytes),
			IgnoreDependencies: true,
		},
	)
	if err != nil {
		return fmt.Errorf("Unable to update application %s: %w", args[0], err)
	}

	color.New(color.FgGreen).Printf("Successfully updated application %s\n", args[0])

	if postDeployReleaseErr != nil {
		// didn't find a post-deploy job, so we're done
		return nil
	}
	color.New(color.FgGreen).Printf("Post-deploy job for application %s found. Updating job to build using tag \"%s\" as well\n", args[0], appTag)
	overrideValues = map[string]interface{}{
		"image": map[string]interface{}{
			"tag": appTag,
		},
	}
	mergedValues = templaterUtils.CoalesceValues(postDeployRelease.Config, overrideValues)

	bytes, err = json.Marshal(mergedValues)
	if err != nil {
		return fmt.Errorf("Unable to update post-deploy job for application %s: %w", args[0], err)
	}
	err = client.UpgradeRelease(
		context.Background(),
		cliConf.Project,
		cliConf.Cluster,
		namespace,
		postDeployReleaseName,
		&types.UpgradeReleaseRequest{
			Values: string(bytes),
		},
	)
	if err != nil {
		return fmt.Errorf("Unable to update post-deploy job for application %s: %w", args[0], err)
	}

	return nil
}
