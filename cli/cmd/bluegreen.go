package cmd

import (
	"context"
	"fmt"
	"os"
	"time"

	"github.com/fatih/color"
	api "github.com/porter-dev/porter/api/client"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/cli/cmd/deploy"
	"github.com/spf13/cobra"
	appsv1 "k8s.io/api/apps/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	intstrutil "k8s.io/apimachinery/pkg/util/intstr"
)

var deployCmd = &cobra.Command{
	Use: "deploy",
}

var bluegreenCmd = &cobra.Command{
	Use:   "blue-green-switch",
	Short: "Automatically switches the traffic of a blue-green deployment once the new application is ready.",
	Run: func(cmd *cobra.Command, args []string) {
		err := checkLoginAndRun(args, bluegreenSwitch)
		if err != nil {
			os.Exit(1)
		}
	},
}

func init() {
	rootCmd.AddCommand(deployCmd)
	deployCmd.AddCommand(bluegreenCmd)

	bluegreenCmd.PersistentFlags().StringVar(
		&app,
		"app",
		"",
		"Application in the Porter dashboard",
	)

	bluegreenCmd.MarkPersistentFlagRequired("app")

	bluegreenCmd.PersistentFlags().StringVar(
		&tag,
		"tag",
		"",
		"The image tag to switch traffic to.",
	)

	bluegreenCmd.PersistentFlags().StringVar(
		&namespace,
		"namespace",
		"",
		"The namespace of the jobs.",
	)
}

func bluegreenSwitch(_ *types.GetAuthenticatedUserResponse, client *api.Client, args []string) error {
	// get the web release
	webRelease, err := client.GetRelease(context.Background(), cliConf.Project, cliConf.Cluster, namespace, app)
	if err != nil {
		return err
	}

	// if this application is not a web chart, throw an error
	if webRelease.Chart.Name() != "web" {
		return fmt.Errorf("target application is not a web chart")
	}

	currActiveImage := deploy.GetCurrActiveBlueGreenImage(webRelease.Config)

	sharedConf := &PorterRunSharedConfig{
		Client: client,
	}

	err = sharedConf.setSharedConfig()

	if err != nil {
		return fmt.Errorf("Could not retrieve kube credentials: %s", err.Error())
	}

	// if no job exists with the given revision, wait up to 30 minutes
	timeWait := time.Now().Add(30 * time.Minute)
	prevRefresh := time.Now()

	success := false

	color.New(color.FgGreen).Printf("Waiting for the new version of the application %s to be ready\n", app)

	for time.Now().Before(timeWait) {
		// refresh the client every 10 minutes
		if time.Now().After(prevRefresh.Add(10 * time.Minute)) {
			err = sharedConf.setSharedConfig()

			if err != nil {
				return fmt.Errorf("Could not retrieve kube credentials: %s", err.Error())
			}

			prevRefresh = time.Now()
		}

		depls, err := sharedConf.Clientset.AppsV1().Deployments(namespace).List(
			context.Background(),
			metav1.ListOptions{
				LabelSelector: fmt.Sprintf("app.kubernetes.io/instance=%s", app),
			},
		)
		if err != nil {
			return fmt.Errorf("could not get deployments: %s", err.Error())
		}

		foundDeployment := false

		// get the deployment which matches the new image tag
		for _, depl := range depls.Items {
			if depl.ObjectMeta.Name == fmt.Sprintf("%s-web-%s", app, tag) || depl.ObjectMeta.Name == fmt.Sprintf("%s-%s", app, tag) {
				foundDeployment = true

				// determine if the deployment has an appropriate number of ready replicas
				minUnavailable := *(depl.Spec.Replicas) - getMaxUnavailable(depl)

				// if the number of ready replicas is greater than the number of min unavailable,
				// the controller is ready for a traffic switch
				if minUnavailable <= depl.Status.ReadyReplicas {
					// push the deployment
					color.New(color.FgGreen).Printf("Switching traffic for app %s\n", app)

					deployAgent, err := updateGetAgent(client)
					if err != nil {
						return err
					}

					if currActiveImage == "" {
						err = deployAgent.UpdateImageAndValues(map[string]interface{}{
							"bluegreen": map[string]interface{}{
								"enabled":                  true,
								"disablePrimaryDeployment": true,
								"activeImageTag":           tag,
								"imageTags":                []string{tag},
							},
						})
					} else {
						err = deployAgent.UpdateImageAndValues(map[string]interface{}{
							"bluegreen": map[string]interface{}{
								"enabled":                  true,
								"disablePrimaryDeployment": true,
								"activeImageTag":           tag,
								"imageTags":                []string{currActiveImage, tag},
							},
						})
					}

					if err != nil {
						return err
					} else {
						success = true
					}
				}
			}
		}

		if !foundDeployment {
			return fmt.Errorf("target deployment not found. Did you specify the correct tag?")
		}

		if success {
			break
		}

		// otherwise, return no error
		time.Sleep(2 * time.Second)
	}

	if !success {
		return fmt.Errorf("new application was not ready within 30 minutes")
	}

	// wait 30 seconds before removing old deployment
	time.Sleep(30 * time.Second)

	deployAgent, err := updateGetAgent(client)
	if err != nil {
		return err
	}

	err = deployAgent.UpdateImageAndValues(map[string]interface{}{
		"bluegreen": map[string]interface{}{
			"enabled":                  true,
			"disablePrimaryDeployment": true,
			"activeImageTag":           tag,
			"imageTags":                []string{tag},
		},
	})

	return nil
}

func getMaxUnavailable(deployment appsv1.Deployment) int32 {
	if deployment.Spec.Strategy.Type != appsv1.RollingUpdateDeploymentStrategyType || *(deployment.Spec.Replicas) == 0 {
		return int32(0)
	}

	desired := *(deployment.Spec.Replicas)
	maxUnavailable := deployment.Spec.Strategy.RollingUpdate.MaxUnavailable

	unavailable, err := intstrutil.GetScaledValueFromIntOrPercent(intstrutil.ValueOrDefault(maxUnavailable, intstrutil.FromInt(0)), int(desired), false)
	if err != nil {
		return 0
	}

	return int32(unavailable)
}
