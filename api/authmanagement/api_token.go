package authmanagement

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/dgrijalva/jwt-go"

	"github.com/google/uuid"
	"github.com/porter-dev/porter/internal/auth/token"
	"github.com/porter-dev/porter/internal/models"

	"github.com/porter-dev/porter/internal/telemetry"

	"github.com/bufbuild/connect-go"
	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"
)

// APIToken returns an encoded token for programmatic access to the Porter UI
func (a AuthManagementService) APIToken(ctx context.Context, req *connect.Request[porterv1.APITokenRequest]) (*connect.Response[porterv1.APITokenResponse], error) {
	ctx, span := telemetry.NewSpan(ctx, "auth-endpoint-api-token")
	defer span.End()

	resp := connect.NewResponse(&porterv1.APITokenResponse{})

	if req == nil {
		return resp, connect.NewError(connect.CodeInvalidArgument, errors.New("missing request"))
	}
	if req.Msg == nil {
		return resp, connect.NewError(connect.CodeInvalidArgument, errors.New("missing request message"))
	}
	if req.Msg.ProjectId == 0 {
		return resp, connect.NewError(connect.CodeInvalidArgument, errors.New("missing project id"))
	}

	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "project-id", Value: req.Msg.ProjectId})

	existingTokens, err := a.Config.APITokenManager.ListAPITokensByProjectID(uint(req.Msg.ProjectId))
	if err != nil {
		return resp, telemetry.Error(ctx, span, err, "error listing api tokens")
	}

	for _, token := range existingTokens {
		if token.Name == "porter-agent-token" {
			telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "token-exists", Value: true})
			telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "token-id", Value: token.UniqueID})
			resp.Msg.Token = token.UniqueID
			return resp, nil
		}
	}

	tokenID, err := uuid.NewUUID()
	if err != nil {
		return resp, telemetry.Error(ctx, span, err, "error generating tokenID")
	}

	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "token-id", Value: tokenID.String()})

	expiresAt := time.Now().Add(time.Hour * 24 * 365)

	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "expires-at", Value: expiresAt.String()})

	apiToken := &models.APIToken{
		UniqueID:   tokenID.String(),
		ProjectID:  uint(req.Msg.ProjectId),
		Expiry:     &expiresAt,
		Revoked:    false,
		PolicyUID:  "developer",
		PolicyName: "developer",
		Name:       "porter-agent-token",
	}

	apiToken, err = a.Config.APITokenManager.CreateAPIToken(apiToken)
	if err != nil {
		return resp, telemetry.Error(ctx, span, err, "error creating api token")
	}

	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "token-id", Value: apiToken.UniqueID})

	now := time.Now().UTC()

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub_kind":   "porter-agent",
		"sub":        string(token.API),
		"iby":        0, // TODO: add a system user id
		"iat":        fmt.Sprintf("%d", now.Unix()),
		"project_id": apiToken.ProjectID,
		"token_id":   apiToken.UniqueID,
	})

	encodedToken, err := token.SignedString([]byte(a.Config.TokenGeneratorSecret))
	if err != nil {
		return resp, telemetry.Error(ctx, span, err, "error signing token")
	}

	resp.Msg.Token = encodedToken

	return resp, nil
}
