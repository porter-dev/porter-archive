package cmd

import (
	"context"
	"encoding/base64"
	"fmt"
	"io/ioutil"
	"os"

	"github.com/porter-dev/porter/internal/kubernetes/local"
	gcpLocal "github.com/porter-dev/porter/internal/providers/gcp/local"
	"github.com/porter-dev/porter/internal/utils"

	"github.com/spf13/viper"

	"github.com/porter-dev/porter/cli/cmd/api"
	"github.com/porter-dev/porter/internal/models"
	"github.com/spf13/cobra"
)

var setConfigCmd = &cobra.Command{
	Use:   "set-config",
	Short: "Uses the local kubeconfig to set the configuration for a cluster",
	Run: func(cmd *cobra.Command, args []string) {
		err := setConfig()

		if err != nil {
			fmt.Printf("Error occurred: %v\n", err)
			os.Exit(1)
		}
	},
}

func init() {
	rootCmd.AddCommand(setConfigCmd)

	setConfigCmd.PersistentFlags().StringVarP(
		&kubeconfigPath,
		"kubeconfig",
		"k",
		"",
		"path to kubeconfig",
	)

	setConfigCmd.PersistentFlags().StringVar(
		&host,
		"host",
		"http://localhost:10000",
		"host url of Porter instance",
	)

	contexts = setConfigCmd.PersistentFlags().StringArray(
		"contexts",
		nil,
		"the list of contexts to use (defaults to the current context)",
	)
}

func setConfig() error {
	// TODO: construct the kubeconfig based on the passed contexts

	// get the current project ID
	projectID := viper.GetUint("project")

	// if project ID is 0, ask the user to set the project ID or create a project
	if projectID == 0 {
		return fmt.Errorf("no project set, please run porter project set [id]")
	}

	// get the kubeconfig
	rawBytes, err := local.GetKubeconfigFromHost(kubeconfigPath, *contexts)

	if err != nil {
		return err
	}

	// send kubeconfig to client
	client := api.NewClient(host+"/api", "cookie.json")

	saCandidates, err := client.CreateProjectCandidates(
		context.Background(),
		projectID,
		&api.CreateProjectCandidatesRequest{
			Kubeconfig: string(rawBytes),
		},
	)

	if err != nil {
		return err
	}

	for _, saCandidate := range saCandidates {
		resolvers := make(api.CreateProjectServiceAccountRequest, 0)

		for _, action := range saCandidate.Actions {
			switch action.Name {
			case models.ClusterCADataAction:
				resolveAction, err := resolveClusterCAAction(action.Filename)

				if err != nil {
					return err
				}

				resolvers = append(resolvers, resolveAction)
			case models.ClientCertDataAction:
				resolveAction, err := resolveClientCertAction(action.Filename)

				if err != nil {
					return err
				}

				resolvers = append(resolvers, resolveAction)
			case models.ClientKeyDataAction:
				resolveAction, err := resolveClientKeyAction(action.Filename)

				if err != nil {
					return err
				}

				resolvers = append(resolvers, resolveAction)
			case models.OIDCIssuerDataAction:
				resolveAction, err := resolveOIDCIssuerAction(action.Filename)

				if err != nil {
					return err
				}

				resolvers = append(resolvers, resolveAction)
			case models.TokenDataAction:
				resolveAction, err := resolveTokenDataAction(action.Filename)

				if err != nil {
					return err
				}

				resolvers = append(resolvers, resolveAction)
			case models.GCPKeyDataAction:
				resolveAction, err := resolveGCPKeyAction(saCandidate.ClusterEndpoint)

				if err != nil {
					return err
				}

				resolvers = append(resolvers, resolveAction)
			case models.AWSKeyDataAction:
			}
		}

		sa, err := client.CreateProjectServiceAccount(
			context.Background(),
			projectID,
			saCandidate.ID,
			resolvers,
		)

		if err != nil {
			return err
		}

		for _, cluster := range sa.Clusters {
			fmt.Printf("created service account for cluster %s with id %d\n", cluster.Name, sa.ID)

			// sanity check to ensure it's working
			// namespaces, err := client.GetK8sNamespaces(
			// 	context.Background(),
			// 	projectID,
			// 	saCandidate.ID,
			// 	cluster.ID,
			// )

			// if err != nil {
			// 	return err
			// }

			// for _, ns := range namespaces.Items {
			// 	fmt.Println(ns.ObjectMeta.GetName())
			// }
		}
	}

	return nil
}

// resolves a cluster ca data action
func resolveClusterCAAction(
	filename string,
) (*models.ServiceAccountAllActions, error) {
	fileBytes, err := ioutil.ReadFile(filename)

	if err != nil {
		return nil, err
	}

	return &models.ServiceAccountAllActions{
		Name:          models.ClusterCADataAction,
		ClusterCAData: base64.StdEncoding.EncodeToString(fileBytes),
	}, nil
}

// resolves a client cert data action
func resolveClientCertAction(
	filename string,
) (*models.ServiceAccountAllActions, error) {
	fileBytes, err := ioutil.ReadFile(filename)

	if err != nil {
		return nil, err
	}

	return &models.ServiceAccountAllActions{
		Name:           models.ClientCertDataAction,
		ClientCertData: base64.StdEncoding.EncodeToString(fileBytes),
	}, nil
}

// resolves a client key data action
func resolveClientKeyAction(
	filename string,
) (*models.ServiceAccountAllActions, error) {
	fileBytes, err := ioutil.ReadFile(filename)

	if err != nil {
		return nil, err
	}

	return &models.ServiceAccountAllActions{
		Name:          models.ClientKeyDataAction,
		ClientKeyData: base64.StdEncoding.EncodeToString(fileBytes),
	}, nil
}

// resolves an oidc issuer data action
func resolveOIDCIssuerAction(
	filename string,
) (*models.ServiceAccountAllActions, error) {
	fileBytes, err := ioutil.ReadFile(filename)

	if err != nil {
		return nil, err
	}

	return &models.ServiceAccountAllActions{
		Name:             models.OIDCIssuerDataAction,
		OIDCIssuerCAData: base64.StdEncoding.EncodeToString(fileBytes),
	}, nil
}

// resolves a token data action
func resolveTokenDataAction(
	filename string,
) (*models.ServiceAccountAllActions, error) {
	fileBytes, err := ioutil.ReadFile(filename)

	if err != nil {
		return nil, err
	}

	return &models.ServiceAccountAllActions{
		Name:      models.TokenDataAction,
		TokenData: string(fileBytes),
	}, nil
}

// resolves a gcp key data action
func resolveGCPKeyAction(endpoint string) (*models.ServiceAccountAllActions, error) {
	agent, _ := gcpLocal.NewDefaultAgent()
	projID, err := agent.GetProjectIDForGKECluster(endpoint)

	if err != nil {
		return nil, err
	}

	agent.ProjectID = projID

	name := "porter-dashboard-" + utils.StringWithCharset(6, "abcdefghijklmnopqrstuvwxyz1234567890")

	// create the service account and give it the correct iam permissions
	resp, err := agent.CreateServiceAccount(name)

	if err != nil {
		return nil, err
	}

	err = agent.SetServiceAccountIAMPolicy(resp)

	if err != nil {
		return nil, err
	}

	// get the service account key data to send to the server
	bytes, err := agent.CreateServiceAccountKey(resp)

	if err != nil {
		return nil, err
	}

	return &models.ServiceAccountAllActions{
		Name:       models.GCPKeyDataAction,
		GCPKeyData: string(bytes),
	}, nil
}

// resolves an aws key data action
