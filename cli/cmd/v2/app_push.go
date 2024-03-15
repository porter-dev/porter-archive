package v2

import "context"

// AppPushInput is the input to the AppPush function
type AppPushInput struct{}

// AppPush pushes an app to a remote registry
func AppPush(ctx context.Context, inp AppPushInput) error {
	return nil
}
