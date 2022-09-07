//go:build ee
// +build ee

package main

import (
	"fmt"
	"os"

	"github.com/porter-dev/porter/internal/kubernetes"
	v2 "github.com/porter-dev/porter/internal/kubernetes/porter_agent/v2"
	"github.com/porter-dev/porter/internal/kubernetes/prometheus"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/notifier"
	"github.com/spf13/cobra"
	"k8s.io/apimachinery/pkg/api/errors"
)

type ClusterPrometheusData struct {
	ProjectName string
	ProjectID   uint

	ClusterID   uint
	ClusterName string

	CanQueryCluster    bool
	HasPrometheus      bool
	CanQueryPrometheus bool

	FailureMessage string
}

type ClusterPorterAgentData struct {
	ProjectName string
	ProjectID   uint

	ClusterID   uint
	ClusterName string

	CanQueryCluster     bool
	HasPorterAgent      bool
	CanQueryPorterAgent bool

	FailureMessage string
}

var prometheusClusterData map[uint]ClusterPrometheusData
var porterAgentClusterData map[uint]ClusterPorterAgentData
var shouldSendEmail bool

var healthCmd = &cobra.Command{
	Use:   "health",
	Short: "Checks the health of various components",
}

var healthPrometheusCmd = &cobra.Command{
	Use:   "prometheus",
	Short: "Checks the health of Prometheus instances",
	Run: func(cmd *cobra.Command, args []string) {
		err := runHealthPrometheus()

		if err != nil {
			os.Exit(1)
		}
	},
}

var healthPorterAgentCmd = &cobra.Command{
	Use:   "porter-agent",
	Short: "Checks the health of porter-agent instances",
	Run: func(cmd *cobra.Command, args []string) {
		err := runHealthPorterAgent()

		if err != nil {
			os.Exit(1)
		}
	},
}

func init() {
	adminCmd.AddCommand(healthCmd)

	healthCmd.PersistentFlags().BoolVarP(
		&shouldSendEmail,
		"email",
		"e",
		true,
		"specify if digest email should be sent",
	)

	healthCmd.AddCommand(healthPrometheusCmd)
	healthCmd.AddCommand(healthPorterAgentCmd)
}

func runHealthPrometheus() error {
	prometheusClusterData = make(map[uint]ClusterPrometheusData)

	err := iterateProjects(IterateProjectsSelector{
		NotFreeTier: true,
	}, prometheusProjectIterator)

	if err != nil {
		return err
	}

	var numClusterUnreachable uint = 0
	var numPrometheusDoesNotExist uint = 0
	var numPrometheusUnqueryable uint = 0
	var workingInstances uint = 0

	for _, data := range prometheusClusterData {
		if !data.CanQueryPrometheus {
			logPrometheusError(data)
		}

		if !data.CanQueryCluster {
			numClusterUnreachable++
		} else if !data.HasPrometheus {
			numPrometheusDoesNotExist++
		} else if !data.CanQueryPrometheus {
			numPrometheusUnqueryable++
		} else {
			workingInstances++
		}
	}

	fmt.Println("instances with cluster unreachable:", numClusterUnreachable)
	fmt.Println("instances where prometheus does not exist:", numPrometheusDoesNotExist)
	fmt.Println("instances where prometheus is unqueryable:", numPrometheusUnqueryable)
	fmt.Println("working instances:", workingInstances)

	if shouldSendEmail {
		if notifyEmail == "" {
			return fmt.Errorf("could not send email: NOTIFY_EMAIL is not defined")
		}

		sendPrometheusDigestEmail()
	}

	return nil
}

func sendPrometheusDigestEmail() {
	text := "Prometheus summary results:\n"
	text += fmt.Sprintf("Total clusters scanned: %d\n", len(prometheusClusterData))

	text += "Clusters which do not have Prometheus installed:\n"
	var numNoPrometheus uint = 0

	for _, data := range prometheusClusterData {
		if data.CanQueryCluster && !data.HasPrometheus {
			text += fmt.Sprintf(
				"Project: %s (%d), Cluster: %s (%d)\n",
				data.ProjectName, data.ProjectID, data.ClusterName, data.ClusterID,
			)
			numNoPrometheus++
		}
	}

	text += fmt.Sprintf("Total: %d\n", numNoPrometheus)

	text += "\n\n"

	text += "Clusters which have a failing Prometheus instance:\n"
	var numFailing uint = 0

	for _, data := range prometheusClusterData {
		if data.CanQueryCluster && !data.CanQueryPrometheus {
			text += fmt.Sprintf(
				"Project: %s (%d), Cluster: %s (%d). Prometheus could not be queried: %s\n",
				data.ProjectName, data.ProjectID, data.ClusterName, data.ClusterID, data.FailureMessage,
			)

			numFailing++
		}
	}

	text += fmt.Sprintf("Total: %d\n", numFailing)

	userNotifier.SendTextEmail(&notifier.SendTextEmailOpts{
		Email:   notifyEmail,
		Text:    text,
		Subject: fmt.Sprintf("[%s] Prometheus health check results", envName),
	})
}

func runHealthPorterAgent() error {
	porterAgentClusterData = make(map[uint]ClusterPorterAgentData)

	err := iterateProjects(IterateProjectsSelector{
		NotFreeTier: true,
	}, porterAgentProjectIterator)

	if err != nil {
		return err
	}

	var numClusterUnreachable uint = 0
	var numPorterAgentDoesNotExist uint = 0
	var numPorterAgentUnqueryable uint = 0
	var workingInstances uint = 0

	for _, data := range porterAgentClusterData {
		if !data.CanQueryPorterAgent {
			logPorterAgentError(data)
		}

		if !data.CanQueryCluster {
			numClusterUnreachable++
		} else if !data.HasPorterAgent {
			numPorterAgentDoesNotExist++
		} else if !data.CanQueryPorterAgent {
			numPorterAgentUnqueryable++
		} else {
			workingInstances++
		}
	}

	fmt.Println("instances with cluster unreachable:", numClusterUnreachable)
	fmt.Println("instances where porter-agent does not exist:", numPorterAgentDoesNotExist)
	fmt.Println("instances where porter-agent is unqueryable:", numPorterAgentUnqueryable)
	fmt.Println("working instances:", workingInstances)

	if shouldSendEmail {
		if notifyEmail == "" {
			return fmt.Errorf("could not send email: NOTIFY_EMAIL is not defined")
		}

		sendPorterAgentDigestEmail()
	}

	return nil
}

func sendPorterAgentDigestEmail() {
	text := "Porter-agent summary results:\n\n"
	text += fmt.Sprintf("Total clusters scanned: %d\n\n", len(porterAgentClusterData))

	text += "Clusters which do not have porter-agent installed:\n"
	var numNoPorterAgent uint = 0

	for _, data := range porterAgentClusterData {
		if data.CanQueryCluster && !data.HasPorterAgent {
			text += fmt.Sprintf(
				"Project: %s (%d), Cluster: %s (%d)\n",
				data.ProjectName, data.ProjectID, data.ClusterName, data.ClusterID,
			)

			numNoPorterAgent++
		}
	}

	text += fmt.Sprintf("Total: %d\n", numNoPorterAgent)

	text += "\n\n"

	text += "Clusters which have a failing porter-agent instance:\n"
	var numFailing uint = 0

	for _, data := range porterAgentClusterData {
		if data.CanQueryCluster && !data.CanQueryPorterAgent {
			text += fmt.Sprintf(
				"Project: %s (%d), Cluster: %s (%d). Porter-agent could not be queried: %s\n",
				data.ProjectName, data.ProjectID, data.ClusterName, data.ClusterID, data.FailureMessage,
			)

			numFailing++
		}
	}

	text += fmt.Sprintf("Total: %d\n", numFailing)

	userNotifier.SendTextEmail(&notifier.SendTextEmailOpts{
		Email:   notifyEmail,
		Text:    text,
		Subject: fmt.Sprintf("[%s] Porter-agent health check results", envName),
	})
}

func prometheusProjectIterator(project *models.Project) error {
	clusters, err := repo.Cluster().ListClustersByProjectID(project.ID)

	if err != nil {
		return err
	}

	for _, cluster := range clusters {
		ooc := &kubernetes.OutOfClusterConfig{
			Cluster:                   cluster,
			Repo:                      repo,
			DigitalOceanOAuth:         doConf,
			AllowInClusterConnections: false,
		}

		agent, err := kubernetes.GetAgentOutOfClusterConfig(ooc)

		if err != nil {
			addPrometheusClusterError(project, cluster, fmt.Sprintf("could not get agent: %s", err))

			continue
		}

		promSvc, exists, err := prometheus.GetPrometheusService(agent.Clientset)

		if err != nil {
			addPrometheusClusterError(project, cluster, err.Error())

			continue
		}

		if !exists {
			addPrometheusNotFoundError(project, cluster)

			continue
		}

		// query a metric
		err = prometheus.TestQueryPrometheus(agent.Clientset, promSvc)

		if err != nil {
			addPrometheusUnqueryableError(project, cluster, err.Error())

			continue
		}

		addPrometheusQueryable(project, cluster)
	}

	return nil
}

func addPrometheusClusterError(project *models.Project, cluster *models.Cluster, message string) {
	prometheusClusterData[cluster.ID] = ClusterPrometheusData{
		ProjectName:        project.Name,
		ProjectID:          cluster.ProjectID,
		ClusterID:          cluster.ID,
		ClusterName:        cluster.Name,
		CanQueryCluster:    false,
		HasPrometheus:      false,
		CanQueryPrometheus: false,
		FailureMessage:     message,
	}
}

func addPrometheusNotFoundError(project *models.Project, cluster *models.Cluster) {
	prometheusClusterData[cluster.ID] = ClusterPrometheusData{
		ProjectName:        project.Name,
		ProjectID:          cluster.ProjectID,
		ClusterID:          cluster.ID,
		ClusterName:        cluster.Name,
		CanQueryCluster:    true,
		HasPrometheus:      false,
		CanQueryPrometheus: false,
		FailureMessage:     "Prometheus was not found",
	}
}

func addPrometheusUnqueryableError(project *models.Project, cluster *models.Cluster, message string) {
	prometheusClusterData[cluster.ID] = ClusterPrometheusData{
		ProjectName:        project.Name,
		ProjectID:          cluster.ProjectID,
		ClusterID:          cluster.ID,
		ClusterName:        cluster.Name,
		CanQueryCluster:    true,
		HasPrometheus:      true,
		CanQueryPrometheus: false,
		FailureMessage:     fmt.Sprintf("Prometheus was found, but could not be queried (it's probably crashing): %s", message),
	}
}

func addPrometheusQueryable(project *models.Project, cluster *models.Cluster) {
	prometheusClusterData[cluster.ID] = ClusterPrometheusData{
		ProjectName:        project.Name,
		ProjectID:          cluster.ProjectID,
		ClusterID:          cluster.ID,
		ClusterName:        cluster.Name,
		CanQueryCluster:    true,
		HasPrometheus:      true,
		CanQueryPrometheus: true,
	}
}

func logPrometheusError(data ClusterPrometheusData) {
	if !data.CanQueryCluster {
		fmt.Printf(
			"Project: %s (%d), Cluster: %s (%d). Cluster could not be queried: %s\n\n",
			data.ProjectName, data.ProjectID, data.ClusterName, data.ClusterID, data.FailureMessage,
		)

		return
	} else if !data.HasPrometheus {
		fmt.Printf(
			"Project: %s (%d), Cluster: %s (%d). Prometheus was not found\n\n",
			data.ProjectName, data.ProjectID, data.ClusterName, data.ClusterID,
		)

		return
	}

	fmt.Printf(
		"Project: %s (%d), Cluster: %s (%d). Prometheus could not be queried: %s\n\n",
		data.ProjectName, data.ProjectID, data.ClusterName, data.ClusterID, data.FailureMessage,
	)
}

func porterAgentProjectIterator(project *models.Project) error {
	clusters, err := repo.Cluster().ListClustersByProjectID(project.ID)

	if err != nil {
		return err
	}

	for _, cluster := range clusters {
		ooc := &kubernetes.OutOfClusterConfig{
			Cluster:                   cluster,
			Repo:                      repo,
			DigitalOceanOAuth:         doConf,
			AllowInClusterConnections: false,
		}

		agent, err := kubernetes.GetAgentOutOfClusterConfig(ooc)

		if err != nil {
			addPorterAgentClusterError(project, cluster, fmt.Sprintf("could not get agent: %s", err))

			continue
		}

		agentSvc, err := v2.GetAgentService(agent.Clientset)

		if err != nil {
			if errors.IsNotFound(err) {
				addPorterAgentNotFoundError(project, cluster)
			} else if err != nil {
				addPorterAgentClusterError(project, cluster, err.Error())
			}

			continue
		}

		_, err = v2.GetAllIncidents(agent.Clientset, agentSvc)

		if err != nil {
			addPorterAgentUnqueryableError(project, cluster, err.Error())

			continue
		}

		addPorterAgentQueryable(project, cluster)
	}

	return nil
}

func addPorterAgentClusterError(project *models.Project, cluster *models.Cluster, message string) {
	porterAgentClusterData[cluster.ID] = ClusterPorterAgentData{
		ProjectName:         project.Name,
		ProjectID:           cluster.ProjectID,
		ClusterID:           cluster.ID,
		ClusterName:         cluster.Name,
		CanQueryCluster:     false,
		HasPorterAgent:      false,
		CanQueryPorterAgent: false,
		FailureMessage:      message,
	}
}

func addPorterAgentNotFoundError(project *models.Project, cluster *models.Cluster) {
	porterAgentClusterData[cluster.ID] = ClusterPorterAgentData{
		ProjectName:         project.Name,
		ProjectID:           cluster.ProjectID,
		ClusterID:           cluster.ID,
		ClusterName:         cluster.Name,
		CanQueryCluster:     true,
		HasPorterAgent:      false,
		CanQueryPorterAgent: false,
		FailureMessage:      "Prometheus was not found",
	}
}

func addPorterAgentUnqueryableError(project *models.Project, cluster *models.Cluster, message string) {
	porterAgentClusterData[cluster.ID] = ClusterPorterAgentData{
		ProjectName:         project.Name,
		ProjectID:           cluster.ProjectID,
		ClusterID:           cluster.ID,
		ClusterName:         cluster.Name,
		CanQueryCluster:     true,
		HasPorterAgent:      true,
		CanQueryPorterAgent: false,
		FailureMessage:      fmt.Sprintf("Prometheus was found, but could not be queried (it's probably crashing): %s", message),
	}
}

func addPorterAgentQueryable(project *models.Project, cluster *models.Cluster) {
	porterAgentClusterData[cluster.ID] = ClusterPorterAgentData{
		ProjectName:         project.Name,
		ProjectID:           cluster.ProjectID,
		ClusterID:           cluster.ID,
		ClusterName:         cluster.Name,
		CanQueryCluster:     true,
		HasPorterAgent:      true,
		CanQueryPorterAgent: true,
	}
}

func logPorterAgentError(data ClusterPorterAgentData) {
	if !data.CanQueryCluster {
		fmt.Printf(
			"Project: %s (%d), Cluster: %s (%d). Cluster could not be queried: %s\n\n",
			data.ProjectName, data.ProjectID, data.ClusterName, data.ClusterID, data.FailureMessage,
		)

		return
	} else if !data.HasPorterAgent {
		fmt.Printf(
			"Project: %s (%d), Cluster: %s (%d). Porter-agent was not found\n\n",
			data.ProjectName, data.ProjectID, data.ClusterName, data.ClusterID,
		)

		return
	}

	fmt.Printf(
		"Project: %s (%d), Cluster: %s (%d). Porter-agent could not be queried: %s\n\n",
		data.ProjectName, data.ProjectID, data.ClusterName, data.ClusterID, data.FailureMessage,
	)
}
