package v2

import (
	"context"
	"fmt"
)

// DeleteDeployment implements the functionality of the `porter delete` command for validate apply v2 projects
func DeleteDeployment(ctx context.Context) error {
	fmt.Println("This command is not supported for your project. Contact support@porter.run for more information.")
	return nil
}

// DeleteApp implements the functionality of the `porter delete apps` command for validate apply v2 projects
func DeleteApp(ctx context.Context) error {
	fmt.Println("This command is not supported for your project. Contact support@porter.run for more information.")
	return nil
}

// DeleteJob implements the functionality of the `porter delete jobs` command for validate apply v2 projects
func DeleteJob(ctx context.Context) error {
	fmt.Println("This command is not supported for your project. Contact support@porter.run for more information.")
	return nil
}
