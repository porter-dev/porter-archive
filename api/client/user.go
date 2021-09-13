package client

import (
	"context"
	"fmt"

	"github.com/porter-dev/porter/api/types"
)

// AuthCheck performs a check to ensure that the user is logged in
func (c *Client) AuthCheck(ctx context.Context) (*types.GetAuthenticatedUserResponse, error) {
	resp := &types.GetAuthenticatedUserResponse{}

	err := c.getRequest(
		fmt.Sprintf(
			"/users/current",
		),
		nil,
		resp,
	)

	return resp, err
}

// Login authorizes the user and grants them a cookie-based session
func (c *Client) Login(ctx context.Context, req *types.LoginUserRequest) (*types.GetAuthenticatedUserResponse, error) {
	resp := &types.GetAuthenticatedUserResponse{}

	err := c.postRequest(
		fmt.Sprintf(
			"/login",
		),
		req,
		resp,
	)

	return resp, err
}

// Logout logs the user out and deauthorizes the cookie-based session
func (c *Client) Logout(ctx context.Context) error {
	return c.postRequest(
		fmt.Sprintf(
			"/logout",
		),
		nil,
		nil,
	)
}

// CreateUser will create the user, authorize the user and grant them a cookie-based session
func (c *Client) CreateUser(
	ctx context.Context,
	req *types.CreateUserRequest,
) (*types.CreateUserResponse, error) {
	resp := &types.CreateUserResponse{}

	err := c.postRequest(
		fmt.Sprintf(
			"/users",
		),
		req,
		resp,
	)

	return resp, err
}

// ListUserProjects returns a list of projects associated with a user
func (c *Client) ListUserProjects(ctx context.Context) (*types.ListUserProjectsResponse, error) {
	resp := &types.ListUserProjectsResponse{}

	err := c.getRequest(
		fmt.Sprintf(
			"/projects",
		),
		nil,
		resp,
	)

	return resp, err
}

// DeleteUser deletes the current user
func (c *Client) DeleteUser(
	ctx context.Context,
) error {
	return c.deleteRequest(
		fmt.Sprintf(
			"/users/current",
		),
		nil,
		nil,
	)
}
