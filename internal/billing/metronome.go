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
	porterStandardTrialDays = 15
)

// MetronomeClient is the client used to call the Metronome API
type MetronomeClient struct {
	ApiKey               string
	billableMetrics      []types.BillableMetric
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

	var trialDays uint
	planID := m.PorterStandardPlanID
	projID := strconv.FormatUint(uint64(projectID), 10)

	if sandboxEnabled {
		planID = m.PorterCloudPlanID

		// This is necessary to avoid conflicts with Porter standard projects
		projID = fmt.Sprintf("porter-cloud-%s", projID)
	} else {
		trialDays = porterStandardTrialDays
	}

	customerID, err = m.createCustomer(ctx, userEmail, projectName, projID, billingID)
	if err != nil {
		return customerID, customerPlanID, telemetry.Error(ctx, span, err, fmt.Sprintf("error while creating customer with plan %s", planID))
	}

	customerPlanID, err = m.addCustomerPlan(ctx, customerID, planID, trialDays)

	return customerID, customerPlanID, err
}

// createCustomer will create the customer in Metronome
func (m MetronomeClient) createCustomer(ctx context.Context, userEmail string, projectName string, projectID string, billingID string) (customerID uuid.UUID, err error) {
	ctx, span := telemetry.NewSpan(ctx, "create-metronome-customer")
	defer span.End()

	path := "customers"

	customer := types.Customer{
		Name: projectName,
		Aliases: []string{
			projectID,
		},
		BillingConfig: types.BillingConfig{
			BillingProviderType:       "stripe",
			BillingProviderCustomerID: billingID,
			StripeCollectionMethod:    defaultCollectionMethod,
		},
		CustomFields: map[string]string{
			"project_id": projectID,
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
func (m MetronomeClient) addCustomerPlan(ctx context.Context, customerID uuid.UUID, planID uuid.UUID, trialDays uint) (customerPlanID uuid.UUID, err error) {
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

	if trialDays != 0 {
		req.Trial = &types.TrialSpec{
			LengthInDays: int64(trialDays),
		}
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

// CreateCreditsGrant will create a new credit grant for the customer with the specified amount
func (m MetronomeClient) CreateCreditsGrant(ctx context.Context, customerID uuid.UUID, grantAmount float64, paidAmount float64, expiresAt string) (err error) {
	ctx, span := telemetry.NewSpan(ctx, "create-credits-grant")
	defer span.End()

	if customerID == uuid.Nil {
		return telemetry.Error(ctx, span, err, "customer id empty")
	}

	path := "credits/createGrant"
	creditTypeID, err := m.getCreditTypeID(ctx, "USD (cents)")
	if err != nil {
		return telemetry.Error(ctx, span, err, "failed to get credit type id")
	}

	// Uniqueness key is used to prevent duplicate grants
	uniquenessKey := fmt.Sprintf("%s-referral-reward", customerID)

	req := types.CreateCreditsGrantRequest{
		CustomerID:    customerID,
		UniquenessKey: uniquenessKey,
		GrantAmount: types.GrantAmountID{
			Amount:       grantAmount,
			CreditTypeID: creditTypeID,
		},
		PaidAmount: types.PaidAmount{
			Amount:       paidAmount,
			CreditTypeID: creditTypeID,
		},
		Name:      "Porter Credits",
		ExpiresAt: expiresAt,
		Priority:  1,
	}

	statusCode, err := m.do(http.MethodPost, path, req, nil)
	if err != nil && statusCode != http.StatusConflict {
		// a conflict response indicates the grant already exists
		return telemetry.Error(ctx, span, err, "failed to create credits grant")
	}

	return nil
}

// ListCustomerUsage will return the aggregated usage for a customer
func (m MetronomeClient) ListCustomerUsage(ctx context.Context, customerID uuid.UUID, startingOn string, endingBefore string, windowsSize string, currentPeriod bool) (usage []types.Usage, err error) {
	ctx, span := telemetry.NewSpan(ctx, "list-customer-usage")
	defer span.End()

	if customerID == uuid.Nil {
		return usage, telemetry.Error(ctx, span, err, "customer id empty")
	}

	if len(m.billableMetrics) == 0 {
		billableMetrics, err := m.listBillableMetricIDs(ctx, customerID)
		if err != nil {
			return nil, telemetry.Error(ctx, span, err, "failed to list billable metrics")
		}

		telemetry.WithAttributes(span,
			telemetry.AttributeKV{Key: "billable-metric-count", Value: len(billableMetrics)},
		)

		// Cache billable metric ids for future calls
		m.billableMetrics = append(m.billableMetrics, billableMetrics...)
	}

	path := "usage/groups"

	baseReq := types.ListCustomerUsageRequest{
		CustomerID:    customerID,
		WindowSize:    windowsSize,
		StartingOn:    startingOn,
		EndingBefore:  endingBefore,
		CurrentPeriod: currentPeriod,
	}

	for _, billableMetric := range m.billableMetrics {
		telemetry.WithAttributes(span,
			telemetry.AttributeKV{Key: "billable-metric-id", Value: billableMetric.ID},
		)

		var result struct {
			Data []types.CustomerUsageMetric `json:"data"`
		}

		baseReq.BillableMetricID = billableMetric.ID
		_, err = m.do(http.MethodPost, path, baseReq, &result)
		if err != nil {
			return usage, telemetry.Error(ctx, span, err, "failed to get customer usage")
		}

		usage = append(usage, types.Usage{
			MetricName:   billableMetric.Name,
			UsageMetrics: result.Data,
		})
	}

	return usage, nil
}

// IngestEvents sends a list of billing events to Metronome's ingest endpoint
func (m MetronomeClient) IngestEvents(ctx context.Context, events []types.BillingEvent) (err error) {
	ctx, span := telemetry.NewSpan(ctx, "ingets-billing-events")
	defer span.End()

	if len(events) == 0 {
		return nil
	}

	path := "ingest"

	var currentAttempts int
	for currentAttempts < defaultMaxRetries {
		statusCode, err := m.do(http.MethodPost, path, events, nil)
		// Check errors that are not from error http codes
		if statusCode == 0 && err != nil {
			return telemetry.Error(ctx, span, err, "failed to ingest billing events")
		}

		if statusCode == http.StatusForbidden || statusCode == http.StatusUnauthorized {
			return telemetry.Error(ctx, span, err, "unauthorized")
		}

		// 400 responses should not be retried
		if statusCode == http.StatusBadRequest {
			return telemetry.Error(ctx, span, err, "malformed billing events")
		}

		// Any other status code can be safely retried
		if statusCode == 200 {
			return nil
		}
		currentAttempts++
	}

	return telemetry.Error(ctx, span, err, "max number of retry attempts reached with no success")
}

func (m MetronomeClient) listBillableMetricIDs(ctx context.Context, customerID uuid.UUID) (billableMetrics []types.BillableMetric, err error) {
	ctx, span := telemetry.NewSpan(ctx, "list-billable-metrics")
	defer span.End()

	if customerID == uuid.Nil {
		return billableMetrics, telemetry.Error(ctx, span, err, "customer id empty")
	}

	path := fmt.Sprintf("/customers/%s/billable-metrics", customerID)

	var result struct {
		Data []types.BillableMetric `json:"data"`
	}

	_, err = m.do(http.MethodGet, path, nil, &result)
	if err != nil {
		return billableMetrics, telemetry.Error(ctx, span, err, "failed to retrieve billable metrics from metronome")
	}

	return result.Data, nil
}

func (m MetronomeClient) getCreditTypeID(ctx context.Context, currencyCode string) (creditTypeID uuid.UUID, err error) {
	ctx, span := telemetry.NewSpan(ctx, "get-credit-type-id")
	defer span.End()

	path := "/credit-types/list"

	var result struct {
		Data []types.PricingUnit `json:"data"`
	}

	_, err = m.do(http.MethodGet, path, nil, &result)
	if err != nil {
		return creditTypeID, telemetry.Error(ctx, span, err, "failed to retrieve billable metrics from metronome")
	}

	for _, pricingUnit := range result.Data {
		if pricingUnit.Name == currencyCode {
			return pricingUnit.ID, nil
		}
	}

	return creditTypeID, telemetry.Error(ctx, span, fmt.Errorf("credit type not found for currency code %s", currencyCode), "failed to find credit type")
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
