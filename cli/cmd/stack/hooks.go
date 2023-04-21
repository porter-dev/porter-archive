package stack

import (
	"context"
	"fmt"
	"strings"

	"github.com/fatih/color"
	api "github.com/porter-dev/porter/api/client"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/cli/cmd/config"
	switchboardTypes "github.com/porter-dev/switchboard/pkg/types"
)

type DeployStackHook struct {
	Client               *api.Client
	StackName            string
	ProjectID, ClusterID uint
	AppResourceGroup     *switchboardTypes.ResourceGroup
}

type StackConfig struct {
	Values       map[string]interface{}
	Dependencies []types.Dependency
}

func (t *DeployStackHook) PreApply() error {
	nsList, err := t.Client.GetK8sNamespaces(
		context.Background(), t.ProjectID, t.ClusterID,
	)
	if err != nil {
		return fmt.Errorf("error fetching namespaces: %w", err)
	}

	found := false

	for _, ns := range *nsList {
		if ns.Name == t.StackName {
			found = true
			break
		}
	}

	if !found {
		composePreviewMessage(fmt.Sprintf("namespace %s does not exist, creating it now", t.StackName), Info)
		createNS := &types.CreateNamespaceRequest{
			Name: t.StackName,
		}

		// create the new namespace
		_, err := t.Client.CreateNewK8sNamespace(context.Background(), t.ProjectID, t.ClusterID, createNS)

		if err != nil && !strings.Contains(err.Error(), "namespace already exists") {
			// ignore the error if the namespace already exists
			//
			// this might happen if someone creates the namespace in between this operation
			return fmt.Errorf("error creating namespace: %w", err)
		}
	}

	return nil
}

func (t *DeployStackHook) DataQueries() map[string]interface{} {
	return nil
}

// deploy the stack
func (t *DeployStackHook) PostApply(driverOutput map[string]interface{}) error {
	// fmt.Println("here are the resources:")
	// for _, res := range t.AppResourceGroup.Resources {
	// 	fmt.Printf("resource: %s\n", res.Name)
	// 	fmt.Printf("driver: %s\n", res.Driver)
	// 	fmt.Printf("source: %v\n", res.Source)
	// 	fmt.Printf("target: %v\n", res.Target)
	// 	fmt.Printf("config: %v\n", res.Config)
	// 	fmt.Printf("depends_on: %v\n", res.DependsOn)
	// 	fmt.Println()
	// }
	// return nil

	fmt.Printf("here is the driverOutput: %+v", driverOutput)

	client := config.GetAPIClient()

	_, err := client.GetRelease(
		context.Background(),
		t.ProjectID,
		t.ClusterID,
		t.StackName,
		t.StackName,
	)

	shouldCreate := err != nil

	if err != nil {
		color.New(color.FgYellow).Printf("Could not read release for stack %s (%s): attempting creation\n", t.StackName, err.Error())
	} else {
		color.New(color.FgGreen).Printf("Found release for stack %s: attempting update\n", t.StackName)
	}

	return t.applyStack(t.AppResourceGroup, client, shouldCreate)
}

func (t *DeployStackHook) applyStack(applications *switchboardTypes.ResourceGroup, client *api.Client, shouldCreate bool) error {
	if applications == nil {
		return fmt.Errorf("no applications found")
	}

	values, err := buildStackValues(applications)
	if err != nil {
		return err
	}

	deps, err := buildStackDependencies(applications, client, t.ProjectID)
	if err != nil {
		return err
	}

	stackConf := StackConfig{
		Values:       values,
		Dependencies: deps,
	}

	if shouldCreate {
		err := t.createStack(client, stackConf)
		if err != nil {
			return fmt.Errorf("error creating stack %s: %w", t.StackName, err)
		}
	} else {
		err := t.updateStack(client, stackConf)
		if err != nil {
			return fmt.Errorf("error updating stack %s: %w", t.StackName, err)
		}
	}

	return nil
}

func (t *DeployStackHook) createStack(client *api.Client, stackConf StackConfig) error {
	// fmt.Println("values and deps: ")
	// fmt.Printf("values: %v\n", stackConf.Values)
	// fmt.Printf("deps: %v\n", stackConf.Dependencies)

	err := client.CreateStack(
		context.Background(),
		t.ProjectID,
		t.ClusterID,
		t.StackName,
		&types.CreateStackReleaseRequest{
			StackName:    t.StackName,
			Values:       convertMap(stackConf.Values).(map[string]interface{}),
			Dependencies: stackConf.Dependencies,
		},
	)
	if err != nil {
		return err
	}

	return nil
}

func (t *DeployStackHook) updateStack(client *api.Client, stackConf StackConfig) error {
	// fmt.Println("values and deps: ")
	// fmt.Printf("values: %v\n", stackConf.Values)
	// fmt.Printf("deps: %v\n", stackConf.Dependencies)

	err := client.UpdateStack(
		context.Background(),
		t.ProjectID,
		t.ClusterID,
		t.StackName,
		&types.CreateStackReleaseRequest{
			StackName:    t.StackName,
			Values:       convertMap(stackConf.Values).(map[string]interface{}),
			Dependencies: stackConf.Dependencies,
		},
	)
	if err != nil {
		return err
	}

	return nil
}

// this is necessary to marshal the resulting object during the request
func convertMap(m interface{}) interface{} {
	switch m := m.(type) {
	case map[string]interface{}:
		for k, v := range m {
			m[k] = convertMap(v)
		}
	case map[interface{}]interface{}:
		result := map[string]interface{}{}
		for k, v := range m {
			result[k.(string)] = convertMap(v)
		}
		return result
	case []interface{}:
		for i, v := range m {
			m[i] = convertMap(v)
		}
	}
	return m
}

func (t *DeployStackHook) OnConsolidatedErrors(map[string]error) {}
func (t *DeployStackHook) OnError(error)                         {}
