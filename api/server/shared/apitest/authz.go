package apitest

import (
	"context"
	"net/http"
	"testing"

	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

func WithProject(t *testing.T, req *http.Request, proj *models.Project) *http.Request {
	ctx := req.Context()
	ctx = context.WithValue(ctx, types.ProjectScope, proj)
	req = req.WithContext(ctx)

	return req
}
