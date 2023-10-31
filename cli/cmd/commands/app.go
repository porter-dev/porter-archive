package commands

import (
	"context"
	"errors"
	"fmt"
	"io"
	"os"
	"strings"
	"time"

	"github.com/fatih/color"
	api "github.com/porter-dev/porter/api/client"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/cli/cmd/config"
	"github.com/porter-dev/porter/cli/cmd/utils"
	v2 "github.com/porter-dev/porter/cli/cmd/v2"
	"github.com/spf13/cobra"
	batchv1 "k8s.io/api/batch/v1"
	v1 "k8s.io/api/core/v1"
	rbacv1 "k8s.io/api/rbac/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/fields"
	"k8s.io/apimachinery/pkg/watch"
	"k8s.io/kubectl/pkg/util/term"

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
	appCpuMilli      int
	appMemoryMi      int
)

const (
	// CommandPrefix_CNB_LIFECYCLE_LAUNCHER is the prefix for the container start command if the image is built using heroku buildpacks
	CommandPrefix_CNB_LIFECYCLE_LAUNCHER = "/cnb/lifecycle/launcher"
	// CommandPrefix_LAUNCHER is a shortened form of the above
	CommandPrefix_LAUNCHER = "launcher"
)

func registerCommand_App(cliConf config.CLIConfig, currentProfile string) *cobra.Command {
	appCmd := &cobra.Command{
		Use:   "app",
		Short: "Runs a command for your application.",
	}

	// appRunCmd represents the "porter app run" subcommand
	appRunCmd := &cobra.Command{
		Use:   "run [application] -- COMMAND [args...]",
		Args:  cobra.MinimumNArgs(2),
		Short: "Runs a command inside a connected cluster container.",
		Run: func(cmd *cobra.Command, args []string) {
			err := checkLoginAndRunWithConfig(cmd, cliConf, currentProfile, args, appRun)
			if err != nil {
				os.Exit(1)
			}
		},
	}
	appRunFlags(appRunCmd)
	appCmd.AddCommand(appRunCmd)

	// appRunCleanupCmd represents the "porter app run cleanup" subcommand
	appRunCleanupCmd := &cobra.Command{
		Use:   "cleanup",
		Args:  cobra.NoArgs,
		Short: "Delete any lingering ephemeral pods that were created with \"porter app run\".",
		Run: func(cmd *cobra.Command, args []string) {
			err := checkLoginAndRunWithConfig(cmd, cliConf, currentProfile, args, appCleanup)
			if err != nil {
				os.Exit(1)
			}
		},
	}
	appRunCmd.AddCommand(appRunCleanupCmd)

	// appUpdateTagCmd represents the "porter app update-tag" subcommand
	appUpdateTagCmd := &cobra.Command{
		Use:   "update-tag [application]",
		Args:  cobra.MinimumNArgs(1),
		Short: "Updates the image tag for an application.",
		Run: func(cmd *cobra.Command, args []string) {
			err := checkLoginAndRunWithConfig(cmd, cliConf, currentProfile, args, appUpdateTag)
			if err != nil {
				os.Exit(1)
			}
		},
	}

	appUpdateTagCmd.PersistentFlags().StringVarP(
		&appTag,
		"tag",
		"t",
		"",
		"the specified tag to use, default is \"latest\"",
	)
	appCmd.AddCommand(appUpdateTagCmd)

	// appRollback represents the "porter app rollback" subcommand
	appRollbackCmd := &cobra.Command{
		Use:   "rollback [application]",
		Args:  cobra.MinimumNArgs(1),
		Short: "Rolls back an application to the last successful revision.",
		RunE: func(cmd *cobra.Command, args []string) error {
			return checkLoginAndRunWithConfig(cmd, cliConf, currentProfile, args, appRollback)
		},
	}
	appCmd.AddCommand(appRollbackCmd)

	return appCmd
}

func appRunFlags(appRunCmd *cobra.Command) {
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

	appRunCmd.PersistentFlags().IntVarP(
		&appCpuMilli,
		"cpu",
		"",
		0,
		"cpu allocation in millicores (1000 millicores = 1 vCPU)",
	)

	appRunCmd.PersistentFlags().IntVarP(
		&appMemoryMi,
		"ram",
		"",
		0,
		"ram allocation in Mi (1024 Mi = 1 GB)",
	)

	appRunCmd.PersistentFlags().StringVarP(
		&appContainerName,
		"container",
		"c",
		"",
		"name of the container inside pod to run the command in",
	)
}

func appRollback(ctx context.Context, _ *types.GetAuthenticatedUserResponse, client api.Client, cliConfig config.CLIConfig, currentProfile string, _ config.FeatureFlags, _ *cobra.Command, args []string) error {
	project, err := client.GetProject(ctx, cliConfig.Project)
	if err != nil {
		return fmt.Errorf("could not retrieve project from Porter API. Please contact support@porter.run")
	}

	if !project.ValidateApplyV2 {
		return fmt.Errorf("rollback command is not enabled for this project")
	}

	appName := args[0]
	if appName == "" {
		return fmt.Errorf("app name must be specified")
	}

	err = v2.Rollback(ctx, v2.RollbackInput{
		CLIConfig: cliConfig,
		Client:    client,
		AppName:   appName,
	})
	if err != nil {
		return fmt.Errorf("failed to rollback app: %w", err)
	}

	return nil
}

func appRun(ctx context.Context, _ *types.GetAuthenticatedUserResponse, client api.Client, cliConfig config.CLIConfig, currentProfile string, _ config.FeatureFlags, _ *cobra.Command, args []string) error {
	execArgs := args[1:]

	color.New(color.FgGreen).Println("Attempting to run", strings.Join(execArgs, " "), "for application", args[0])

	project, err := client.GetProject(ctx, cliConfig.Project)
	if err != nil {
		return fmt.Errorf("could not retrieve project from Porter API. Please contact support@porter.run")
	}

	var podsSimple []appPodSimple

	// updated exec args includes launcher command prepended if needed, otherwise it is the same as execArgs
	var updatedExecArgs []string
	if project.ValidateApplyV2 {
		podsSimple, updatedExecArgs, namespace, err = getPodsFromV2PorterYaml(ctx, execArgs, client, cliConfig, args[0])
		if err != nil {
			return err
		}
		appNamespace = namespace
	} else {
		appNamespace = fmt.Sprintf("porter-stack-%s", args[0])
		podsSimple, updatedExecArgs, err = getPodsFromV1PorterYaml(ctx, execArgs, client, cliConfig, args[0], appNamespace)
		if err != nil {
			return err
		}
	}

	// if length of pods is 0, throw error
	var selectedPod appPodSimple

	if len(podsSimple) == 0 {
		return fmt.Errorf("At least one pod must exist in this deployment.")
	} else if !appExistingPod || len(podsSimple) == 1 {
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
		Client:    client,
		CLIConfig: cliConfig,
	}

	err = config.setSharedConfig(ctx)

	if err != nil {
		return fmt.Errorf("Could not retrieve kube credentials: %s", err.Error())
	}

	imageName, err := getImageNameFromPod(ctx, config.Clientset, appNamespace, selectedPod.Name, selectedContainerName)
	if err != nil {
		return err
	}

	if appExistingPod {
		_, _ = color.New(color.FgGreen).Printf("Connecting to existing pod which is running an image named: %s\n", imageName)
		return appExecuteRun(config, appNamespace, selectedPod.Name, selectedContainerName, updatedExecArgs)
	}

	_, _ = color.New(color.FgGreen).Println("Creating a copy pod using image: ", imageName)

	return appExecuteRunEphemeral(ctx, config, appNamespace, selectedPod.Name, selectedContainerName, updatedExecArgs)
}

func getImageNameFromPod(ctx context.Context, clientset *kubernetes.Clientset, namespace, podName, containerName string) (string, error) {
	pod, err := clientset.CoreV1().Pods(namespace).Get(ctx, podName, metav1.GetOptions{})
	if err != nil {
		return "", err
	}

	for _, container := range pod.Spec.Containers {
		if container.Name == containerName {
			return container.Image, nil
		}
	}

	return "", fmt.Errorf("could not find container %s in pod %s", containerName, podName)
}

func appCleanup(ctx context.Context, _ *types.GetAuthenticatedUserResponse, client api.Client, cliConfig config.CLIConfig, currentProfile string, _ config.FeatureFlags, _ *cobra.Command, _ []string) error {
	config := &AppPorterRunSharedConfig{
		Client:    client,
		CLIConfig: cliConfig,
	}

	err := config.setSharedConfig(ctx)
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
		namespaces, err := config.Clientset.CoreV1().Namespaces().List(ctx, metav1.ListOptions{})
		if err != nil {
			return err
		}

		for _, namespace := range namespaces.Items {
			if pods, err := appGetEphemeralPods(ctx, namespace.Name, config.Clientset); err == nil {
				podNames = append(podNames, pods...)
			} else {
				return err
			}
		}
	} else {
		if pods, err := appGetEphemeralPods(ctx, appNamespace, config.Clientset); err == nil {
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
		_, _ = color.New(color.FgBlue).Printf("Deleting ephemeral pod: %s\n", podName)

		err = config.Clientset.CoreV1().Pods(appNamespace).Delete(
			ctx, podName, metav1.DeleteOptions{},
		)
		if err != nil {
			return err
		}
	}

	return nil
}

func appGetEphemeralPods(ctx context.Context, namespace string, clientset *kubernetes.Clientset) ([]string, error) {
	var podNames []string

	pods, err := clientset.CoreV1().Pods(namespace).List(
		ctx, metav1.ListOptions{LabelSelector: "porter/ephemeral-pod"},
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
	Client     api.Client
	RestConf   *rest.Config
	Clientset  *kubernetes.Clientset
	RestClient *rest.RESTClient
	CLIConfig  config.CLIConfig
}

func (p *AppPorterRunSharedConfig) setSharedConfig(ctx context.Context) error {
	pID := p.CLIConfig.Project
	cID := p.CLIConfig.Cluster

	kubeResp, err := p.Client.GetKubeconfig(ctx, pID, cID, p.CLIConfig.Kubeconfig)
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

func appGetPodsV1PorterYaml(ctx context.Context, cliConfig config.CLIConfig, client api.Client, namespace, releaseName string) ([]appPodSimple, bool, error) {
	pID := cliConfig.Project
	cID := cliConfig.Cluster

	var containerHasLauncherStartCommand bool

	resp, err := client.GetK8sAllPods(ctx, pID, cID, namespace, releaseName)
	if err != nil {
		return nil, containerHasLauncherStartCommand, err
	}

	if resp == nil {
		return nil, containerHasLauncherStartCommand, errors.New("get pods response is nil")
	}
	pods := *resp

	if len(pods) == 0 {
		return nil, containerHasLauncherStartCommand, errors.New("no running pods found for this application")
	}

	for _, container := range pods[0].Spec.Containers {
		if len(container.Command) > 0 && (container.Command[0] == CommandPrefix_LAUNCHER || container.Command[0] == CommandPrefix_CNB_LIFECYCLE_LAUNCHER) {
			containerHasLauncherStartCommand = true
		}
	}

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

	return res, containerHasLauncherStartCommand, nil
}

func appGetPodsV2PorterYaml(ctx context.Context, cliConfig config.CLIConfig, client api.Client, porterAppName string) ([]appPodSimple, string, bool, error) {
	pID := cliConfig.Project
	cID := cliConfig.Cluster
	var containerHasLauncherStartCommand bool

	targetResp, err := client.DefaultDeploymentTarget(ctx, pID, cID)
	if err != nil {
		return nil, "", containerHasLauncherStartCommand, fmt.Errorf("error calling default deployment target endpoint: %w", err)
	}

	if targetResp.DeploymentTargetID == "" {
		return nil, "", containerHasLauncherStartCommand, errors.New("deployment target id is empty")
	}

	resp, err := client.PorterYamlV2Pods(ctx, pID, cID, porterAppName, &types.PorterYamlV2PodsRequest{
		DeploymentTargetID: targetResp.DeploymentTargetID,
	})
	if err != nil {
		return nil, "", containerHasLauncherStartCommand, err
	}

	if resp == nil {
		return nil, "", containerHasLauncherStartCommand, errors.New("get pods response is nil")
	}
	pods := *resp

	if len(pods) == 0 {
		return nil, "", containerHasLauncherStartCommand, errors.New("no running pods found for this application")
	}

	namespace := pods[0].Namespace

	for _, container := range pods[0].Spec.Containers {
		if len(container.Command) > 0 && (container.Command[0] == CommandPrefix_LAUNCHER || container.Command[0] == CommandPrefix_CNB_LIFECYCLE_LAUNCHER) {
			containerHasLauncherStartCommand = true
		}
	}

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

	return res, namespace, containerHasLauncherStartCommand, nil
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

func appExecuteRunEphemeral(ctx context.Context, config *AppPorterRunSharedConfig, namespace, name, container string, args []string) error {
	existing, err := appGetExistingPod(ctx, config, name, namespace)
	if err != nil {
		return err
	}

	newPod, err := appCreateEphemeralPodFromExisting(ctx, config, existing, container, args)
	if err != nil {
		return err
	}
	podName := newPod.ObjectMeta.Name

	// delete the ephemeral pod no matter what
	defer appDeletePod(ctx, config, podName, namespace) //nolint:errcheck,gosec // do not want to change logic of CLI. New linter error

	_, _ = color.New(color.FgYellow).Printf("Waiting for pod %s to be ready...", podName)
	if err = appWaitForPod(ctx, config, newPod); err != nil {
		color.New(color.FgRed).Println("failed")
		return appHandlePodAttachError(ctx, err, config, namespace, podName, container)
	}

	err = appCheckForPodDeletionCronJob(ctx, config)
	if err != nil {
		return err
	}

	// refresh pod info for latest status
	newPod, err = config.Clientset.CoreV1().
		Pods(newPod.Namespace).
		Get(ctx, newPod.Name, metav1.GetOptions{})

	// pod exited while we were waiting.  maybe an error maybe not.
	// we dont know if the user wanted an interactive shell or not.
	// if it was an error the logs hopefully say so.
	if appIsPodExited(newPod) {
		color.New(color.FgGreen).Println("complete!")
		var writtenBytes int64
		writtenBytes, _ = appPipePodLogsToStdout(ctx, config, namespace, podName, container, false)

		if appVerbose || writtenBytes == 0 {
			color.New(color.FgYellow).Println("Could not get logs. Pod events:")
			_ = appPipeEventsToStdout(ctx, config, namespace, podName, container, false) //nolint:errcheck,gosec // do not want to change logic of CLI. New linter error
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
		return appHandlePodAttachError(ctx, err, config, namespace, podName, container)
	}

	if appVerbose {
		color.New(color.FgYellow).Println("Pod events:")
		_ = appPipeEventsToStdout(ctx, config, namespace, podName, container, false) //nolint:errcheck,gosec // do not want to change logic of CLI. New linter error
	}

	return err
}

func appCheckForPodDeletionCronJob(ctx context.Context, config *AppPorterRunSharedConfig) error {
	// try and create the cron job and all of the other required resources as necessary,
	// starting with the service account, then role and then a role binding

	err := appCheckForServiceAccount(ctx, config)
	if err != nil {
		return err
	}

	err = appCheckForClusterRole(ctx, config)
	if err != nil {
		return err
	}

	err = appCheckForRoleBinding(ctx, config)
	if err != nil {
		return err
	}

	namespaces, err := config.Clientset.CoreV1().Namespaces().List(ctx, metav1.ListOptions{})
	if err != nil {
		return err
	}

	for _, namespace := range namespaces.Items {
		cronJobs, err := config.Clientset.BatchV1().CronJobs(namespace.Name).List(
			ctx, metav1.ListOptions{},
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
						ctx, cronJob.Name, metav1.DeleteOptions{},
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
		ctx, cronJob, metav1.CreateOptions{},
	)
	if err != nil {
		return err
	}

	return nil
}

func appCheckForServiceAccount(ctx context.Context, config *AppPorterRunSharedConfig) error {
	namespaces, err := config.Clientset.CoreV1().Namespaces().List(ctx, metav1.ListOptions{})
	if err != nil {
		return err
	}

	for _, namespace := range namespaces.Items {
		serviceAccounts, err := config.Clientset.CoreV1().ServiceAccounts(namespace.Name).List(
			ctx, metav1.ListOptions{},
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
						ctx, svcAccount.Name, metav1.DeleteOptions{},
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
		ctx, serviceAccount, metav1.CreateOptions{},
	)
	if err != nil {
		return err
	}

	return nil
}

func appCheckForClusterRole(ctx context.Context, config *AppPorterRunSharedConfig) error {
	roles, err := config.Clientset.RbacV1().ClusterRoles().List(
		ctx, metav1.ListOptions{},
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
		ctx, role, metav1.CreateOptions{},
	)
	if err != nil {
		return err
	}

	return nil
}

func appCheckForRoleBinding(ctx context.Context, config *AppPorterRunSharedConfig) error {
	bindings, err := config.Clientset.RbacV1().ClusterRoleBindings().List(
		ctx, metav1.ListOptions{},
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
		ctx, binding, metav1.CreateOptions{},
	)
	if err != nil {
		return err
	}

	return nil
}

func appWaitForPod(ctx context.Context, config *AppPorterRunSharedConfig, pod *v1.Pod) error {
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
			Watch(ctx, metav1.ListOptions{FieldSelector: selector})

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
				Get(ctx, pod.Name, metav1.GetOptions{})
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

func appHandlePodAttachError(ctx context.Context, err error, config *AppPorterRunSharedConfig, namespace, podName, container string) error {
	if appVerbose {
		color.New(color.FgYellow).Fprintf(os.Stderr, "Error: %s\n", err)
	}
	color.New(color.FgYellow).Fprintln(os.Stderr, "Could not open a shell to this container. Container logs:")

	var writtenBytes int64
	writtenBytes, _ = appPipePodLogsToStdout(ctx, config, namespace, podName, container, false)

	if appVerbose || writtenBytes == 0 {
		color.New(color.FgYellow).Fprintln(os.Stderr, "Could not get logs. Pod events:")
		_ = appPipeEventsToStdout(ctx, config, namespace, podName, container, false) //nolint:errcheck,gosec // do not want to change logic of CLI. New linter error
	}
	return err
}

func appPipePodLogsToStdout(ctx context.Context, config *AppPorterRunSharedConfig, namespace, name, container string, follow bool) (int64, error) {
	podLogOpts := v1.PodLogOptions{
		Container: container,
		Follow:    follow,
	}

	req := config.Clientset.CoreV1().Pods(namespace).GetLogs(name, &podLogOpts)

	podLogs, err := req.Stream(
		ctx,
	)
	if err != nil {
		return 0, err
	}

	defer podLogs.Close()

	return io.Copy(os.Stdout, podLogs)
}

func appPipeEventsToStdout(ctx context.Context, config *AppPorterRunSharedConfig, namespace, name, _ string, _ bool) error {
	// update the config in case the operation has taken longer than token expiry time
	config.setSharedConfig(ctx) //nolint:errcheck,gosec // do not want to change logic of CLI. New linter error

	// creates the clientset
	resp, err := config.Clientset.CoreV1().Events(namespace).List(
		ctx,
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

func appGetExistingPod(ctx context.Context, config *AppPorterRunSharedConfig, name, namespace string) (*v1.Pod, error) {
	return config.Clientset.CoreV1().Pods(namespace).Get(
		ctx,
		name,
		metav1.GetOptions{},
	)
}

func appDeletePod(ctx context.Context, config *AppPorterRunSharedConfig, name, namespace string) error {
	// update the config in case the operation has taken longer than token expiry time
	config.setSharedConfig(ctx) //nolint:errcheck,gosec // do not want to change logic of CLI. New linter error

	err := config.Clientset.CoreV1().Pods(namespace).Delete(
		ctx,
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
	ctx context.Context,
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

			var newCpu int
			if appCpuMilli != 0 {
				newCpu = appCpuMilli
			} else if newPod.Spec.Containers[i].Resources.Requests.Cpu() != nil && newPod.Spec.Containers[i].Resources.Requests.Cpu().MilliValue() > 500 {
				newCpu = 500
			}
			if newCpu != 0 {
				newPod.Spec.Containers[i].Resources.Limits[v1.ResourceCPU] = resource.MustParse(fmt.Sprintf("%dm", newCpu))
				newPod.Spec.Containers[i].Resources.Requests[v1.ResourceCPU] = resource.MustParse(fmt.Sprintf("%dm", newCpu))

				for j := 0; j < len(newPod.Spec.Containers[i].Env); j++ {
					if newPod.Spec.Containers[i].Env[j].Name == "PORTER_RESOURCES_CPU" {
						newPod.Spec.Containers[i].Env[j].Value = fmt.Sprintf("%dm", newCpu)
						break
					}
				}
			}

			var newMemory int
			if appMemoryMi != 0 {
				newMemory = appMemoryMi
			} else if newPod.Spec.Containers[i].Resources.Requests.Memory() != nil && newPod.Spec.Containers[i].Resources.Requests.Memory().Value() > 1000*1024*1024 {
				newMemory = 1000
			}
			if newMemory != 0 {
				newPod.Spec.Containers[i].Resources.Limits[v1.ResourceMemory] = resource.MustParse(fmt.Sprintf("%dMi", newMemory))
				newPod.Spec.Containers[i].Resources.Requests[v1.ResourceMemory] = resource.MustParse(fmt.Sprintf("%dMi", newMemory))

				for j := 0; j < len(newPod.Spec.Containers[i].Env); j++ {
					if newPod.Spec.Containers[i].Env[j].Name == "PORTER_RESOURCES_RAM" {
						newPod.Spec.Containers[i].Env[j].Value = fmt.Sprintf("%dMi", newMemory)
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
		ctx,
		newPod,
		metav1.CreateOptions{},
	)
}

func appUpdateTag(ctx context.Context, user *types.GetAuthenticatedUserResponse, client api.Client, cliConf config.CLIConfig, currentProfile string, featureFlags config.FeatureFlags, cmd *cobra.Command, args []string) error {
	project, err := client.GetProject(ctx, cliConf.Project)
	if err != nil {
		return fmt.Errorf("could not retrieve project from Porter API. Please contact support@porter.run")
	}

	if project.ValidateApplyV2 {
		tag, err := v2.UpdateImage(ctx, appTag, client, cliConf.Project, cliConf.Cluster, args[0])
		if err != nil {
			return fmt.Errorf("error updating tag: %w", err)
		}
		_, _ = color.New(color.FgGreen).Printf("Successfully updated application %s to use tag \"%s\"\n", args[0], tag)
		return nil
	} else {
		namespace := fmt.Sprintf("porter-stack-%s", args[0])
		if appTag == "" {
			appTag = "latest"
		}
		release, err := client.GetRelease(ctx, cliConf.Project, cliConf.Cluster, namespace, args[0])
		if err != nil {
			return fmt.Errorf("Unable to find application %s", args[0])
		}
		repository, ok := release.Config["global"].(map[string]interface{})["image"].(map[string]interface{})["repository"].(string)
		if !ok || repository == "" {
			return fmt.Errorf("Application %s does not have an associated image repository. Unable to update tag", args[0])
		}
		imageInfo := types.ImageInfo{
			Repository: repository,
			Tag:        appTag,
		}
		createUpdatePorterAppRequest := &types.CreatePorterAppRequest{
			ClusterID:       cliConf.Cluster,
			ProjectID:       cliConf.Project,
			ImageInfo:       imageInfo,
			OverrideRelease: false,
		}

		_, _ = color.New(color.FgGreen).Printf("Updating application %s to build using tag \"%s\"\n", args[0], appTag)

		_, err = client.CreatePorterApp(
			ctx,
			cliConf.Project,
			cliConf.Cluster,
			args[0],
			createUpdatePorterAppRequest,
		)
		if err != nil {
			return fmt.Errorf("Unable to update application %s: %w", args[0], err)
		}

		_, _ = color.New(color.FgGreen).Printf("Successfully updated application %s to use tag \"%s\"\n", args[0], appTag)
		return nil
	}
}

func getPodsFromV1PorterYaml(ctx context.Context, execArgs []string, client api.Client, cliConfig config.CLIConfig, porterAppName string, namespace string) ([]appPodSimple, []string, error) {
	podsSimple, containerHasLauncherStartCommand, err := appGetPodsV1PorterYaml(ctx, cliConfig, client, namespace, porterAppName)
	if err != nil {
		return nil, nil, fmt.Errorf("could not retrieve list of pods: %s", err.Error())
	}

	if len(execArgs) > 0 && execArgs[0] != CommandPrefix_CNB_LIFECYCLE_LAUNCHER && execArgs[0] != CommandPrefix_LAUNCHER && containerHasLauncherStartCommand {
		execArgs = append([]string{CommandPrefix_CNB_LIFECYCLE_LAUNCHER}, execArgs...)
	}

	return podsSimple, execArgs, nil
}

func getPodsFromV2PorterYaml(ctx context.Context, execArgs []string, client api.Client, cliConfig config.CLIConfig, porterAppName string) ([]appPodSimple, []string, string, error) {
	podsSimple, namespace, containerHasLauncherStartCommand, err := appGetPodsV2PorterYaml(ctx, cliConfig, client, porterAppName)
	if err != nil {
		return nil, nil, "", fmt.Errorf("could not retrieve list of pods: %w", err)
	}

	if len(execArgs) > 0 && execArgs[0] != CommandPrefix_CNB_LIFECYCLE_LAUNCHER && execArgs[0] != CommandPrefix_LAUNCHER && containerHasLauncherStartCommand {
		execArgs = append([]string{CommandPrefix_CNB_LIFECYCLE_LAUNCHER}, execArgs...)
	}

	return podsSimple, execArgs, namespace, nil
}
