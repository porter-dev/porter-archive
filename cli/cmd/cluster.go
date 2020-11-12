package cmd

import (
	"context"
	"fmt"
	"os"
	"text/tabwriter"

	"github.com/porter-dev/porter/cli/cmd/api"
	"github.com/spf13/cobra"
)

// clusterCmd represents the "porter cluster" base command when called
// without any subcommands
var clusterCmd = &cobra.Command{
	Use:   "cluster",
	Short: "Commands that read from a connected cluster",
}

var listClusterNSCmd = &cobra.Command{
	Use:   "namespace list",
	Short: "Lists the namespaces in a cluster (used for testing connection)",
	Run: func(cmd *cobra.Command, args []string) {
		err := checkLoginAndRun(args, listNamespaces)

		if err != nil {
			os.Exit(1)
		}
	},
}

func init() {
	rootCmd.AddCommand(clusterCmd)

	clusterCmd.PersistentFlags().UintVar(
		&clusterID,
		"cluster-id",
		getClusterID(),
		"id of the cluster",
	)

	clusterCmd.AddCommand(listClusterNSCmd)
}

func listNamespaces(user *api.AuthCheckResponse, client *api.Client, args []string) error {
	pID := getProjectID()
	clusters, err := client.ListProjectClusters(context.Background(), pID)

	if err != nil {
		return err
	}

	// get the service account based on the cluster id
	cID := getClusterID()
	var saID uint = 0

	for _, cluster := range clusters {
		if cluster.ID == cID {
			saID = cluster.ServiceAccountID
		}
	}

	if saID == 0 {
		return fmt.Errorf("could not find cluster with id %d", cID)
	}

	// get the list of namespaces
	namespaces, err := client.GetK8sNamespaces(
		context.Background(),
		pID,
		saID,
		cID,
	)

	if err != nil {
		return err
	}

	w := new(tabwriter.Writer)
	w.Init(os.Stdout, 3, 8, 0, '\t', tabwriter.AlignRight)

	fmt.Fprintf(w, "%s\t%s\n", "NAME", "STATUS")

	for _, namespace := range namespaces.Items {
		fmt.Fprintf(w, "%s\t%s\n", namespace.Name, namespace.Status.Phase)
	}

	w.Flush()

	return nil
}
