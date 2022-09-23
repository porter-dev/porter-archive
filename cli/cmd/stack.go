package cmd

import (
	"context"
	"fmt"
	"os"

	"github.com/fatih/color"
	api "github.com/porter-dev/porter/api/client"
	"github.com/porter-dev/porter/api/types"
	"github.com/spf13/cobra"
)

var linkedApps []string

// stackCmd represents the "porter stack" base command when called
// without any subcommands
var stackCmd = &cobra.Command{
	Use:     "stack",
	Aliases: []string{"stacks"},
	Short:   "Commands that control Porter Stacks",
}

var stackEnvGroupCmd = &cobra.Command{
	Use:     "env-group",
	Aliases: []string{"eg", "envgroup", "env-groups", "envgroups"},
	Short:   "Commands to add or remove an env group in a stack",
	Run: func(cmd *cobra.Command, args []string) {
		color.New(color.FgRed).Println("need to specify an operation to continue")
	},
}

var stackEnvGroupAddCmd = &cobra.Command{
	Use:   "add [name]",
	Args:  cobra.ExactArgs(1),
	Short: "Add an env group to a stack",
	Run: func(cmd *cobra.Command, args []string) {
		err := checkLoginAndRun(args, stackAddEnvGroup)

		if err != nil {
			os.Exit(1)
		}
	},
}

var stackEnvGroupRemoveCmd = &cobra.Command{
	Use:   "remove [name]",
	Args:  cobra.ExactArgs(1),
	Short: "Remove an existing env group from a stack",
	Run: func(cmd *cobra.Command, args []string) {
		err := checkLoginAndRun(args, stackRemoveEnvGroup)

		if err != nil {
			os.Exit(1)
		}
	},
}

func init() {
	rootCmd.AddCommand(stackCmd)

	stackCmd.AddCommand(stackEnvGroupCmd)

	stackCmd.PersistentFlags().StringVar(
		&name,
		"name",
		"",
		"the name of the stack",
	)

	stackCmd.PersistentFlags().StringVar(
		&namespace,
		"namespace",
		"default",
		"the namespace of the stack",
	)

	stackEnvGroupAddCmd.PersistentFlags().StringArrayVarP(
		&normalEnvGroupVars,
		"normal",
		"n",
		[]string{},
		"list of variables to set, in the form VAR=VALUE",
	)

	stackEnvGroupAddCmd.PersistentFlags().StringArrayVarP(
		&secretEnvGroupVars,
		"secret",
		"s",
		[]string{},
		"list of secret variables to set, in the form VAR=VALUE",
	)

	stackEnvGroupAddCmd.PersistentFlags().StringArrayVar(
		&linkedApps,
		"linked-apps",
		[]string{},
		"list of stack apps to link this env group with",
	)

	stackEnvGroupCmd.AddCommand(stackEnvGroupAddCmd)
	stackEnvGroupCmd.AddCommand(stackEnvGroupRemoveCmd)
}

func stackAddEnvGroup(_ *types.GetAuthenticatedUserResponse, client *api.Client, args []string) error {
	envGroupName := args[0]

	if len(envGroupName) == 0 {
		return fmt.Errorf("empty env group name")
	} else if len(name) == 0 {
		return fmt.Errorf("empty stack name")
	} else if len(normalEnvGroupVars) == 0 && len(secretEnvGroupVars) == 0 {
		return fmt.Errorf("one or more variables are required to create the env group")
	}

	listStacks, err := client.ListStacks(context.Background(), cliConf.Project, cliConf.Cluster, namespace)

	if err != nil {
		return err
	}

	stacks := *listStacks

	var stackID string

	for _, stk := range stacks {
		if stk.Name == name {
			stackID = stk.ID
		}
	}

	if len(stackID) == 0 {
		return fmt.Errorf("stack not found")
	}

	normalVariables := make(map[string]string)
	secretVariables := make(map[string]string)

	for _, v := range normalEnvGroupVars {
		key, val, err := validateVarValue(v)

		if err != nil {
			return err
		}

		normalVariables[key] = val
	}

	for _, v := range secretEnvGroupVars {
		key, val, err := validateVarValue(v)

		if err != nil {
			return err
		}

		secretVariables[key] = val
	}

	err = client.AddEnvGroupToStack(
		context.Background(), cliConf.Project, cliConf.Cluster, namespace, stackID,
		&types.CreateStackEnvGroupRequest{
			Name:               envGroupName,
			Variables:          normalVariables,
			SecretVariables:    secretVariables,
			LinkedApplications: linkedApps,
		},
	)

	if err != nil {
		return err
	}

	color.New(color.FgGreen).Println("successfully added env group")

	return nil
}

func stackRemoveEnvGroup(_ *types.GetAuthenticatedUserResponse, client *api.Client, args []string) error {
	envGroupName := args[0]

	if len(envGroupName) == 0 {
		return fmt.Errorf("empty env group name")
	} else if len(name) == 0 {
		return fmt.Errorf("empty stack name")
	}

	listStacks, err := client.ListStacks(context.Background(), cliConf.Project, cliConf.Cluster, namespace)

	if err != nil {
		return err
	}

	stacks := *listStacks

	var stackID string

	for _, stk := range stacks {
		if stk.Name == name {
			stackID = stk.ID
		}
	}

	if len(stackID) == 0 {
		return fmt.Errorf("stack not found")
	}

	err = client.RemoveEnvGroupFromStack(context.Background(), cliConf.Project, cliConf.Cluster, namespace, stackID,
		envGroupName)

	if err != nil {
		return err
	}

	color.New(color.FgGreen).Println("successfully removed env group")

	return nil
}
