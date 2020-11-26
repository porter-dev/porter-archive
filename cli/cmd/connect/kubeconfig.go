package connect

import (
	"context"
	"encoding/base64"
	"errors"
	"fmt"
	"io/ioutil"
	"os"
	"strings"

	"github.com/fatih/color"
	awsLocal "github.com/porter-dev/porter/cli/cmd/providers/aws/local"
	gcpLocal "github.com/porter-dev/porter/cli/cmd/providers/gcp/local"
	"github.com/porter-dev/porter/cli/cmd/utils"
	"github.com/porter-dev/porter/internal/kubernetes/local"

	"github.com/porter-dev/porter/cli/cmd/api"
	"github.com/porter-dev/porter/internal/models"
)

// Kubeconfig creates a service account for a project by parsing the local
// kubeconfig and resolving actions that must be performed.
func Kubeconfig(
	client *api.Client,
	kubeconfigPath string,
	contexts []string,
	projectID uint,
	isLocal bool,
) error {
	// if project ID is 0, ask the user to set the project ID or create a project
	if projectID == 0 {
		return fmt.Errorf("no project set, please run porter project set [id]")
	}

	// get the kubeconfig
	rawBytes, err := local.GetKubeconfigFromHost(kubeconfigPath, contexts)

	if err != nil {
		return err
	}

	// send kubeconfig to client
	ccs, err := client.CreateProjectCandidates(
		context.Background(),
		projectID,
		&api.CreateProjectCandidatesRequest{
			Kubeconfig: string(rawBytes),
			IsLocal:    isLocal,
		},
	)

	if err != nil {
		return err
	}

	for _, cc := range ccs {
		var cluster *models.ClusterExternal

		if len(cc.Resolvers) > 0 {
			allResolver := &models.ClusterResolverAll{}

			for _, resolver := range cc.Resolvers {
				switch resolver.Name {
				case models.ClusterCAData:
					absKubeconfigPath, err := local.ResolveKubeconfigPath(kubeconfigPath)

					if err != nil {
						return err
					}

					filename, err := utils.GetFileReferenceFromKubeconfig(
						resolver.Data["filename"],
						absKubeconfigPath,
					)

					if err != nil {
						return err
					}

					err = resolveClusterCAAction(filename, allResolver)

					if err != nil {
						return err
					}
				case models.ClusterLocalhost:
					err := resolveLocalhostAction(allResolver)

					if err != nil {
						return err
					}
				case models.ClientCertData:
					absKubeconfigPath, err := local.ResolveKubeconfigPath(kubeconfigPath)

					if err != nil {
						return err
					}

					filename, err := utils.GetFileReferenceFromKubeconfig(
						resolver.Data["filename"],
						absKubeconfigPath,
					)

					if err != nil {
						return err
					}

					err = resolveClientCertAction(filename, allResolver)

					if err != nil {
						return err
					}
				case models.ClientKeyData:
					absKubeconfigPath, err := local.ResolveKubeconfigPath(kubeconfigPath)

					if err != nil {
						return err
					}

					filename, err := utils.GetFileReferenceFromKubeconfig(
						resolver.Data["filename"],
						absKubeconfigPath,
					)

					if err != nil {
						return err
					}

					err = resolveClientKeyAction(filename, allResolver)

					if err != nil {
						return err
					}
				case models.OIDCIssuerData:
					absKubeconfigPath, err := local.ResolveKubeconfigPath(kubeconfigPath)

					if err != nil {
						return err
					}

					filename, err := utils.GetFileReferenceFromKubeconfig(
						resolver.Data["filename"],
						absKubeconfigPath,
					)

					if err != nil {
						return err
					}

					err = resolveOIDCIssuerAction(filename, allResolver)

					if err != nil {
						return err
					}
				case models.TokenData:
					absKubeconfigPath, err := local.ResolveKubeconfigPath(kubeconfigPath)

					if err != nil {
						return err
					}

					filename, err := utils.GetFileReferenceFromKubeconfig(
						resolver.Data["filename"],
						absKubeconfigPath,
					)

					if err != nil {
						return err
					}

					err = resolveTokenDataAction(filename, allResolver)

					if err != nil {
						return err
					}
				case models.GCPKeyData:
					err := resolveGCPKeyAction(
						cc.Server,
						cc.Name,
						allResolver,
					)

					if err != nil {
						return err
					}
				case models.AWSData:
					err := resolveAWSAction(
						cc.Server,
						cc.Name,
						cc.AWSClusterIDGuess,
						kubeconfigPath,
						cc.ContextName,
						allResolver,
					)

					if err != nil {
						return err
					}
				}
			}

			resp, err := client.CreateProjectCluster(
				context.Background(),
				projectID,
				cc.ID,
				allResolver,
			)

			if err != nil {
				return err
			}

			clExt := models.ClusterExternal(*resp)

			cluster = &clExt
		} else {
			resp, err := client.GetProjectCluster(
				context.Background(),
				projectID,
				cc.CreatedClusterID,
			)

			if err != nil {
				return err
			}

			clExt := models.ClusterExternal(*resp)

			cluster = &clExt
		}

		color.New(color.FgGreen).Printf("created cluster %s with id %d\n", cluster.Name, cluster.ID)
	}

	return nil
}

// resolves a cluster ca data action
func resolveClusterCAAction(
	filename string,
	resolver *models.ClusterResolverAll,
) error {
	fileBytes, err := ioutil.ReadFile(filename)

	if err != nil {
		return err
	}

	resolver.ClusterCAData = base64.StdEncoding.EncodeToString(fileBytes)

	return nil
}

func resolveLocalhostAction(
	resolver *models.ClusterResolverAll,
) error {
	resolver.ClusterHostname = "host.docker.internal"

	return nil
}

// resolves a client cert data action
func resolveClientCertAction(
	filename string,
	resolver *models.ClusterResolverAll,
) error {
	fileBytes, err := ioutil.ReadFile(filename)

	if err != nil {
		return err
	}

	resolver.ClientCertData = base64.StdEncoding.EncodeToString(fileBytes)

	return nil
}

// resolves a client key data action
func resolveClientKeyAction(
	filename string,
	resolver *models.ClusterResolverAll,
) error {
	fileBytes, err := ioutil.ReadFile(filename)

	if err != nil {
		return err
	}

	resolver.ClientKeyData = base64.StdEncoding.EncodeToString(fileBytes)

	return nil
}

// resolves an oidc issuer data action
func resolveOIDCIssuerAction(
	filename string,
	resolver *models.ClusterResolverAll,
) error {
	fileBytes, err := ioutil.ReadFile(filename)

	if err != nil {
		return err
	}

	resolver.OIDCIssuerCAData = base64.StdEncoding.EncodeToString(fileBytes)

	return nil
}

// resolves a token data action
func resolveTokenDataAction(
	filename string,
	resolver *models.ClusterResolverAll,
) error {
	fileBytes, err := ioutil.ReadFile(filename)

	if err != nil {
		return err
	}

	resolver.TokenData = string(fileBytes)

	return nil
}

// resolves a gcp key data action
func resolveGCPKeyAction(
	endpoint string,
	clusterName string,
	resolver *models.ClusterResolverAll,
) error {
	userResp, err := utils.PromptPlaintext(
		fmt.Sprintf(
			`Detected GKE cluster in kubeconfig for the endpoint %s (%s). 
Porter can set up a service account in your GCP project to connect to this cluster automatically.
Would you like to proceed? %s `,
			color.New(color.FgCyan).Sprintf("%s", endpoint),
			clusterName,
			color.New(color.FgCyan).Sprintf("[y/n]"),
		),
	)

	if err != nil {
		return err
	}

	if userResp := strings.ToLower(userResp); userResp == "y" || userResp == "yes" {
		agent, err := gcpLocal.NewDefaultAgent()

		if err != nil {
			color.New(color.FgRed).Printf("Automatic creation failed, manual input required. Error was: %v\n", err)
			return resolveGCPKeyActionManual(endpoint, clusterName, resolver)
		}

		projID, err := agent.GetProjectIDForGKECluster(endpoint)

		if err != nil {
			color.New(color.FgRed).Printf("Automatic creation failed, manual input required. Error was: %v\n", err)
			return resolveGCPKeyActionManual(endpoint, clusterName, resolver)
		}

		agent.ProjectID = projID

		name := "porter-dashboard-" + utils.StringWithCharset(6, "abcdefghijklmnopqrstuvwxyz1234567890")

		// create the service account and give it the correct iam permissions
		resp, err := agent.CreateServiceAccount(name)

		if err != nil {
			color.New(color.FgRed).Printf("Automatic creation failed, manual input required. Error was: %v\n", err)
			return resolveGCPKeyActionManual(endpoint, clusterName, resolver)
		}

		err = agent.SetServiceAccountIAMPolicy(resp)

		if err != nil {
			color.New(color.FgRed).Printf("Automatic creation failed, manual input required. Error was: %v\n", err)
			return resolveGCPKeyActionManual(endpoint, clusterName, resolver)
		}

		// get the service account key data to send to the server
		bytes, err := agent.CreateServiceAccountKey(resp)

		if err != nil {
			color.New(color.FgRed).Printf("Automatic creation failed, manual input required. Error was: %v\n", err)
			return resolveGCPKeyActionManual(endpoint, clusterName, resolver)
		}

		resolver.GCPKeyData = string(bytes)

		return nil
	}

	return resolveGCPKeyActionManual(endpoint, clusterName, resolver)
}

func resolveGCPKeyActionManual(
	endpoint string,
	clusterName string,
	resolver *models.ClusterResolverAll,
) error {
	keyFileLocation, err := utils.PromptPlaintext(fmt.Sprintf(`Please provide the full path to a service account key file.
Key file location: `))

	if err != nil {
		return err
	}

	// attempt to read the key file location
	if info, err := os.Stat(keyFileLocation); !os.IsNotExist(err) && !info.IsDir() {
		// read the file
		bytes, err := ioutil.ReadFile(keyFileLocation)

		if err != nil {
			return err
		}

		resolver.GCPKeyData = string(bytes)

		return nil
	}

	return errors.New("Key file not found")
}

// resolves an aws key data action
func resolveAWSAction(
	endpoint string,
	clusterName string,
	awsClusterIDGuess string,
	kubeconfigPath string,
	contextName string,
	resolver *models.ClusterResolverAll,
) error {
	userResp, err := utils.PromptPlaintext(
		fmt.Sprintf(
			`Detected AWS cluster in kubeconfig for the endpoint %s (%s). 
Porter can set up an IAM user in your AWS account to connect to this cluster automatically.
Would you like to proceed? %s `,
			color.New(color.FgCyan).Sprintf("%s", endpoint),
			clusterName,
			color.New(color.FgCyan).Sprintf("[y/n]"),
		),
	)

	if err != nil {
		return err
	}

	if userResp := strings.ToLower(userResp); userResp == "y" || userResp == "yes" {
		agent, err := awsLocal.NewDefaultAgent(kubeconfigPath, contextName)

		if err != nil {
			color.New(color.FgRed).Printf("Automatic creation failed, manual input required. Error was: %v\n", err)
			return resolveAWSActionManual(endpoint, clusterName, awsClusterIDGuess, resolver)
		}

		creds, err := agent.CreateIAMKubernetesMapping(awsClusterIDGuess)

		if err != nil {
			color.New(color.FgRed).Printf("Automatic creation failed, manual input required. Error was: %v\n", err)
			return resolveAWSActionManual(endpoint, clusterName, awsClusterIDGuess, resolver)
		}

		resolver.AWSAccessKeyID = creds.AWSAccessKeyID
		resolver.AWSSecretAccessKey = creds.AWSSecretAccessKey
		resolver.AWSClusterID = creds.AWSClusterID

		return nil
	}

	// fallback to manual
	return resolveAWSActionManual(endpoint, clusterName, awsClusterIDGuess, resolver)
}

func resolveAWSActionManual(
	endpoint string,
	clusterName string,
	awsClusterIDGuess string,
	resolver *models.ClusterResolverAll,
) error {
	// query to see if the AWS cluster ID guess is correct
	var clusterID string

	userResp, err := utils.PromptPlaintext(
		fmt.Sprintf(
			`Detected AWS cluster ID as %s. Is this correct? %s `,
			color.New(color.FgCyan).Sprintf(awsClusterIDGuess),
			color.New(color.FgCyan).Sprintf("[y/n]"),
		),
	)

	if err != nil {
		return err
	}

	if userResp := strings.ToLower(userResp); userResp == "y" || userResp == "yes" {
		clusterID = awsClusterIDGuess
	} else {
		clusterID, err = utils.PromptPlaintext(fmt.Sprintf(`Cluster ID: `))

		if err != nil {
			return err
		}
	}

	// query for the access key id
	accessKeyID, err := utils.PromptPlaintext(fmt.Sprintf(`AWS Access Key ID: `))

	if err != nil {
		return err
	}

	// query for the secret access key
	secretKey, err := utils.PromptPlaintext(fmt.Sprintf(`AWS Secret Access Key: `))

	if err != nil {
		return err
	}

	resolver.AWSAccessKeyID = accessKeyID
	resolver.AWSSecretAccessKey = secretKey
	resolver.AWSClusterID = clusterID

	return nil
}
