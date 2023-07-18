package authmanagement

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"

	"github.com/dgrijalva/jwt-go"

	"github.com/porter-dev/porter/internal/auth/token"
	"github.com/porter-dev/porter/internal/models"

	"github.com/porter-dev/porter/internal/telemetry"

	"github.com/bufbuild/connect-go"
	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"
)

// APIToken returns an encoded token for programmatic access to the Porter UI. Currently, this token is hardcoded
// to use the "porter-agent-token" name. Once this endpoint is used for multiple tokens, the GRPC request should
// include the token name or type as an argument.
func (a AuthManagementService) APIToken(ctx context.Context, req *connect.Request[porterv1.APITokenRequest]) (*connect.Response[porterv1.APITokenResponse], error) {
	ctx, span := telemetry.NewSpan(ctx, "auth-endpoint-api-token")
	defer span.End()

	resp := connect.NewResponse(&porterv1.APITokenResponse{})

	if req == nil {
		err := telemetry.Error(ctx, span, nil, "missing request")
		return resp, connect.NewError(connect.CodeInvalidArgument, err)
	}
	if req.Msg == nil {
		err := telemetry.Error(ctx, span, nil, "missing request message")
		return resp, connect.NewError(connect.CodeInvalidArgument, err)
	}
	if req.Msg.ProjectId == 0 {
		err := telemetry.Error(ctx, span, nil, "missing project id")
		return resp, connect.NewError(connect.CodeInvalidArgument, err)
	}

	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "project-id", Value: req.Msg.ProjectId})

	existingTokens, err := a.Config.APITokenManager.ListAPITokensByProjectID(uint(req.Msg.ProjectId))
	if err != nil {
		return resp, telemetry.Error(ctx, span, err, "error listing api tokens")
	}

	var apiToken *models.APIToken
	for _, tok := range existingTokens {
		if tok.Name == "porter-agent-token" {
			telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "token-exists", Value: true})
			apiToken = tok
		}
	}

	if apiToken == nil {
		telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "token-exists", Value: false})

		tokenID, err := uuid.NewUUID()
		if err != nil {
			return resp, telemetry.Error(ctx, span, err, "error generating tokenID")
		}

		expiresAt := time.Now().Add(time.Hour * 24 * 365)

		apiToken = &models.APIToken{
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
	}

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "token-id", Value: apiToken.UniqueID},
		telemetry.AttributeKV{Key: "expiry", Value: apiToken.Expiry.UTC().String()},
	)

	now := time.Now().UTC()

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub_kind":   "porter-agent",
		"sub":        string(token.API),
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
