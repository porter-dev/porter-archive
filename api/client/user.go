package client

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

// AuthCheckResponse is the user model response that is returned if the
// user is logged in
type AuthCheckResponse models.UserExternal

// AuthCheck performs a check to ensure that the user is logged in
func (c *Client) AuthCheck(ctx context.Context) (*AuthCheckResponse, error) {
	req, err := http.NewRequest(
		"GET",
		fmt.Sprintf("%s/users/current", c.BaseURL),
		nil,
	)

	if err != nil {
		return nil, err
	}

	req = req.WithContext(ctx)

	bodyResp := &AuthCheckResponse{}

	if httpErr, err := c.sendRequest(req, bodyResp, true); httpErr != nil || err != nil {
		if httpErr != nil {
			return nil, fmt.Errorf("code %d, errors %v", httpErr.Code, httpErr.Errors)
		}

		return nil, err
	}

	return bodyResp, nil
}

// LoginRequest is the email/password associated with a login request
type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// LoginResponse is the user model response that is returned after successfully
// logging in
type LoginResponse models.UserExternal

// Login authorizes the user and grants them a cookie-based session
func (c *Client) Login(ctx context.Context, loginRequest *LoginRequest) (*LoginResponse, error) {
	data, err := json.Marshal(loginRequest)

	if err != nil {
		return nil, err
	}

	req, err := http.NewRequest(
		"POST",
		fmt.Sprintf("%s/login", c.BaseURL),
		strings.NewReader(string(data)),
	)

	if err != nil {
		return nil, err
	}

	req = req.WithContext(ctx)
	bodyResp := &LoginResponse{}

	if httpErr, err := c.sendRequest(req, bodyResp, false); httpErr != nil || err != nil {
		if httpErr != nil {
			return nil, fmt.Errorf("code %d, errors %v", httpErr.Code, httpErr.Errors)
		}

		return nil, err
	}

	return bodyResp, nil
}

// Logout logs the user out and deauthorizes the cookie-based session
func (c *Client) Logout(ctx context.Context) error {
	req, err := http.NewRequest(
		"POST",
		fmt.Sprintf("%s/logout", c.BaseURL),
		nil,
	)

	if err != nil {
		return err
	}

	req = req.WithContext(ctx)

	if httpErr, err := c.sendRequest(req, nil, true); httpErr != nil || err != nil {
		if httpErr != nil {
			return fmt.Errorf("code %d, errors %v", httpErr.Code, httpErr.Errors)
		}

		return err
	}

	return nil
}

// CreateUserRequest is the email/password associated with creating a user
type CreateUserRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// CreateUserResponse is the user model response that is returned after successfully
// creating a user
type CreateUserResponse models.UserExternal

// CreateUser will create the user, authorize the user and grant them a cookie-based session
func (c *Client) CreateUser(
	ctx context.Context,
	createUserRequest *CreateUserRequest,
) (*CreateUserResponse, error) {
	data, err := json.Marshal(createUserRequest)

	if err != nil {
		return nil, err
	}

	req, err := http.NewRequest(
		"POST",
		fmt.Sprintf("%s/users", c.BaseURL),
		strings.NewReader(string(data)),
	)

	if err != nil {
		return nil, err
	}

	req = req.WithContext(ctx)
	bodyResp := &CreateUserResponse{}

	if httpErr, err := c.sendRequest(req, bodyResp, false); httpErr != nil || err != nil {
		if httpErr != nil {
			return nil, fmt.Errorf("code %d, errors %v", httpErr.Code, httpErr.Errors)
		}

		return nil, err
	}

	return bodyResp, nil
}

// ListUserProjectsResponse is the list of projects returned
type ListUserProjectsResponse []*types.Project

// ListUserProjects returns a list of projects associated with a user
func (c *Client) ListUserProjects(ctx context.Context, userID uint) (ListUserProjectsResponse, error) {
	req, err := http.NewRequest(
		"GET",
		fmt.Sprintf("%s/projects", c.BaseURL),
		nil,
	)

	if err != nil {
		return nil, err
	}

	req = req.WithContext(ctx)

	bodyResp := ListUserProjectsResponse{}

	if httpErr, err := c.sendRequest(req, &bodyResp, true); httpErr != nil || err != nil {
		if httpErr != nil {
			return nil, fmt.Errorf("code %d, errors %v", httpErr.Code, httpErr.Errors)
		}

		return nil, err
	}

	return bodyResp, nil
}

// DeleteUserRequest is the password needed to verify a user should be deleted
type DeleteUserRequest struct {
	Password string `json:"password"`
}

// DeleteUser deletes a user of a given user id
func (c *Client) DeleteUser(
	ctx context.Context,
	userID uint,
	deleteUserRequest *DeleteUserRequest,
) error {
	data, err := json.Marshal(deleteUserRequest)

	if err != nil {
		return err
	}

	req, err := http.NewRequest(
		"DELETE",
		fmt.Sprintf("%s/users/%d", c.BaseURL, userID),
		strings.NewReader(string(data)),
	)

	if err != nil {
		return err
	}

	req = req.WithContext(ctx)

	if httpErr, err := c.sendRequest(req, nil, true); httpErr != nil || err != nil {
		if httpErr != nil {
			return fmt.Errorf("code %d, errors %v", httpErr.Code, httpErr.Errors)
		}

		return err
	}

	return nil
}
