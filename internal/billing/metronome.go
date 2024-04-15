package billing

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"time"

	"github.com/google/uuid"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/telemetry"
)

const (
	metronomeBaseUrl        = "https://api.metronome.com/v1/"
	defaultCollectionMethod = "charge_automatically"
	defaultMaxRetries       = 10
)

// MetronomeClient is the client used to call the Metronome API
type MetronomeClient struct {
	ApiKey               string
	PorterCloudPlanID    uuid.UUID
	PorterStandardPlanID uuid.UUID
}

// NewMetronomeClient returns a new Metronome client
func NewMetronomeClient(metronomeApiKey string, porterCloudPlanID string, porterStandardPlanID string) (client MetronomeClient, err error) {
	porterCloudPlanUUID, err := uuid.Parse(porterCloudPlanID)
	if err != nil {
		return client, err
	}

	porterStandardPlanUUID, err := uuid.Parse(porterStandardPlanID)
	if err != nil {
		return client, err
	}

	return MetronomeClient{
		ApiKey:               metronomeApiKey,
		PorterCloudPlanID:    porterCloudPlanUUID,
		PorterStandardPlanID: porterStandardPlanUUID,
	}, nil
}

// CreateCustomerWithPlan will create the customer in Metronome and immediately add it to the plan
func (m MetronomeClient) CreateCustomerWithPlan(ctx context.Context, userEmail string, projectName string, projectID uint, billingID string, sandboxEnabled bool) (customerID uuid.UUID, customerPlanID uuid.UUID, err error) {
	ctx, span := telemetry.NewSpan(ctx, "add-metronome-customer-plan")
	defer span.End()

	planID := m.PorterStandardPlanID
	if sandboxEnabled {
		planID = m.PorterCloudPlanID
	}

	customerID, err = m.createCustomer(ctx, userEmail, projectName, projectID, billingID)
	if err != nil {
		return customerID, customerPlanID, telemetry.Error(ctx, span, err, fmt.Sprintf("error while creating customer with plan %s", planID))
	}

	customerPlanID, err = m.addCustomerPlan(ctx, customerID, planID)

	return customerID, customerPlanID, err
}

// createCustomer will create the customer in Metronome
func (m MetronomeClient) createCustomer(ctx context.Context, userEmail string, projectName string, projectID uint, billingID string) (customerID uuid.UUID, err error) {
	ctx, span := telemetry.NewSpan(ctx, "create-metronome-customer")
	defer span.End()

	path := "customers"
	projIDStr := strconv.FormatUint(uint64(projectID), 10)

	customer := types.Customer{
		Name: projectName,
		Aliases: []string{
			projIDStr,
		},
		BillingConfig: types.BillingConfig{
			BillingProviderType:       "stripe",
			BillingProviderCustomerID: billingID,
			StripeCollectionMethod:    defaultCollectionMethod,
		},
		CustomFields: map[string]string{
			"project_id": projIDStr,
			"user_email": userEmail,
		},
	}

	var result struct {
		Data types.Customer `json:"data"`
	}

	_, err = m.do(http.MethodPost, path, customer, &result)
	if err != nil {
		return customerID, telemetry.Error(ctx, span, err, "error creating customer")
	}
	return result.Data.ID, nil
}

// addCustomerPlan will start the customer on the given plan
func (m MetronomeClient) addCustomerPlan(ctx context.Context, customerID uuid.UUID, planID uuid.UUID) (customerPlanID uuid.UUID, err error) {
	ctx, span := telemetry.NewSpan(ctx, "add-metronome-customer-plan")
	defer span.End()

	if customerID == uuid.Nil || planID == uuid.Nil {
		return customerPlanID, telemetry.Error(ctx, span, err, "customer or plan id empty")
	}

	path := fmt.Sprintf("/customers/%s/plans/add", customerID)

	// Plan start time must be midnight UTC, formatted as RFC3339 timestamp
	now := time.Now()
	midnightUTC := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
	startOn := midnightUTC.Format(time.RFC3339)

	req := types.AddCustomerPlanRequest{
		PlanID:        planID,
		StartingOnUTC: startOn,
	}

	var result struct {
		Data struct {
			CustomerPlanID uuid.UUID `json:"id"`
		} `json:"data"`
	}

	_, err = m.do(http.MethodPost, path, req, &result)
	if err != nil {
		return customerPlanID, telemetry.Error(ctx, span, err, "failed to add customer to plan")
	}

	return result.Data.CustomerPlanID, nil
}

// ListCustomerPlan will return the current active plan to which the user is subscribed
func (m MetronomeClient) ListCustomerPlan(ctx context.Context, customerID uuid.UUID) (plan types.Plan, err error) {
	ctx, span := telemetry.NewSpan(ctx, "list-customer-plans")
	defer span.End()

	if customerID == uuid.Nil {
		return plan, telemetry.Error(ctx, span, err, "customer id empty")
	}

	path := fmt.Sprintf("/customers/%s/plans", customerID)

	var result struct {
		Data []types.Plan `json:"data"`
	}

	_, err = m.do(http.MethodGet, path, nil, &result)
	if err != nil {
		return plan, telemetry.Error(ctx, span, err, "failed to list customer plans")
	}

	if len(result.Data) > 0 {
		plan = result.Data[0]
	}

	return plan, nil
}

// EndCustomerPlan will immediately end the plan for the given customer
func (m MetronomeClient) EndCustomerPlan(ctx context.Context, customerID uuid.UUID, customerPlanID uuid.UUID) (err error) {
	ctx, span := telemetry.NewSpan(ctx, "end-metronome-customer-plan")
	defer span.End()

	if customerID == uuid.Nil || customerPlanID == uuid.Nil {
		return telemetry.Error(ctx, span, err, "customer or customer plan id empty")
	}

	path := fmt.Sprintf("/customers/%s/plans/%s/end", customerID, customerPlanID)

	// Plan start time must be midnight UTC, formatted as RFC3339 timestamp
	now := time.Now()
	midnightUTC := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
	endBefore := midnightUTC.Format(time.RFC3339)

	req := types.EndCustomerPlanRequest{
		EndingBeforeUTC: endBefore,
	}

	_, err = m.do(http.MethodPost, path, req, nil)
	if err != nil {
		return telemetry.Error(ctx, span, err, "failed to end customer plan")
	}

	return nil
}

// ListCustomerCredits will return the total number of credits for the customer
func (m MetronomeClient) ListCustomerCredits(ctx context.Context, customerID uuid.UUID) (credits types.ListCreditGrantsResponse, err error) {
	ctx, span := telemetry.NewSpan(ctx, "list-customer-credits")
	defer span.End()

	if customerID == uuid.Nil {
		return credits, telemetry.Error(ctx, span, err, "customer id empty")
	}

	path := "credits/listGrants"

	req := types.ListCreditGrantsRequest{
		CustomerIDs: []uuid.UUID{
			customerID,
		},
	}

	var result struct {
		Data []types.CreditGrant `json:"data"`
	}

	_, err = m.do(http.MethodPost, path, req, &result)
	if err != nil {
		return credits, telemetry.Error(ctx, span, err, "failed to list customer credits")
	}

	var response types.ListCreditGrantsResponse
	for _, grant := range result.Data {
		response.GrantedCredits += grant.GrantAmount.Amount
		response.RemainingCredits += grant.Balance.IncludingPending
	}

	return response, nil
}

// GetCustomerDashboard will return an embeddable Metronome dashboard
func (m MetronomeClient) GetCustomerDashboard(ctx context.Context, customerID uuid.UUID, dashboardType string, options []types.DashboardOption, colorOverrides []types.ColorOverride) (url string, err error) {
	ctx, span := telemetry.NewSpan(ctx, "get-customer-usage-dashboard")
	defer span.End()

	if customerID == uuid.Nil {
		return url, telemetry.Error(ctx, span, err, "customer id empty")
	}

	path := "dashboards/getEmbeddableUrl"

	req := types.EmbeddableDashboardRequest{
		CustomerID:     customerID,
		Options:        options,
		DashboardType:  dashboardType,
		ColorOverrides: colorOverrides,
	}

	var result struct {
		Data map[string]string `json:"data"`
	}

	_, err = m.do(http.MethodPost, path, req, &result)
	if err != nil {
		return url, telemetry.Error(ctx, span, err, "failed to get embeddable dashboard")
	}

	return result.Data["url"], nil
}

// IngestEvents sends a list of billing events to Metronome's ingest endpoint
func (m MetronomeClient) IngestEvents(ctx context.Context, events []types.BillingEvent) (err error) {
	path := "ingest"

	var currentAttempts int
	for currentAttempts < defaultMaxRetries {
		statusCode, err := m.do(http.MethodPost, path, events, nil)
		// Check errors that are not from error http codes
		if statusCode == 0 && err != nil {
			return err
		}

		if statusCode == http.StatusForbidden || statusCode == http.StatusUnauthorized {
			return fmt.Errorf("unauthorized")
		}

		// 400 responses should not be retried
		if statusCode == http.StatusBadRequest {
			return fmt.Errorf("malformed billing events")
		}

		// Any other status code can be safely retried
		if statusCode == 200 {
			return nil
		}
		currentAttempts++
	}

	return fmt.Errorf("max number of retry attempts reached with no success")
}

func (m MetronomeClient) do(method string, path string, body interface{}, data interface{}) (statusCode int, err error) {
	client := http.Client{}
	endpoint, err := url.JoinPath(metronomeBaseUrl, path)
	if err != nil {
		return statusCode, err
	}

	var bodyJson []byte
	if body != nil {
		bodyJson, err = json.Marshal(body)
		if err != nil {
			return statusCode, err
		}
	}

	req, err := http.NewRequest(method, endpoint, bytes.NewBuffer(bodyJson))
	if err != nil {
		return statusCode, err
	}
	bearer := "Bearer " + m.ApiKey
	req.Header.Set("Authorization", bearer)
	req.Header.Set("Content-Type", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		return statusCode, err
	}
	statusCode = resp.StatusCode

	if resp.StatusCode != http.StatusOK {
		// If there is an error, try to decode the message
		var message map[string]string
		err = json.NewDecoder(resp.Body).Decode(&message)
		if err != nil {
			return statusCode, fmt.Errorf("status code %d received, couldn't process response message", resp.StatusCode)
		}
		_ = resp.Body.Close()

		return statusCode, fmt.Errorf("status code %d received, response message: %v", resp.StatusCode, message)
	}

	if data != nil {
		err = json.NewDecoder(resp.Body).Decode(data)
		if err != nil {
			return statusCode, err
		}
	}
	_ = resp.Body.Close()

	return statusCode, nil
}
