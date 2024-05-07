package billing

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/getlago/lago-go-client"
	"github.com/google/uuid"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/telemetry"
)

const (
	defaultMaxRetries        = 10
	porterStandardTrialDays  = 15
	defaultRewardAmountCents = 1000
	defaultPaidAmountCents   = 0
	maxReferralRewards       = 10
	maxIngestEventLimit      = 100
)

// LagoClient is the client used to call the Lago API
type LagoClient struct {
	client               lago.Client
	billableMetrics      []types.BillableMetric
	PorterCloudPlanID    string
	PorterStandardPlanID string

	// DefaultRewardAmountCents is the default amount in USD cents rewarded to users
	// who successfully refer a new user
	DefaultRewardAmountCents int64
	// MaxReferralRewards is the maximum number of referral rewards a user can receive
	MaxReferralRewards int64
}

// NewLagoClient returns a new Metronome client
func NewLagoClient(lagoApiKey string, porterCloudPlanID string, porterStandardPlanID string) (client LagoClient, err error) {
	lagoClient := lago.New().
		SetApiKey("__YOU_API_KEY__")

	return LagoClient{
		client:                   *lagoClient,
		PorterCloudPlanID:        porterCloudPlanID,
		PorterStandardPlanID:     porterStandardPlanID,
		DefaultRewardAmountCents: defaultRewardAmountCents,
		MaxReferralRewards:       maxReferralRewards,
	}, nil
}

// CreateCustomerWithPlan will create the customer in Metronome and immediately add it to the plan
func (m LagoClient) CreateCustomerWithPlan(ctx context.Context, userEmail string, projectName string, projectID uint, billingID string, sandboxEnabled bool) (err error) {
	ctx, span := telemetry.NewSpan(ctx, "add-metronome-customer-plan")
	defer span.End()

	planID := m.PorterStandardPlanID
	if sandboxEnabled {
		planID = m.PorterCloudPlanID
	}

	customerID, err := m.createCustomer(ctx, userEmail, projectName, projectID, billingID, sandboxEnabled)
	if err != nil {
		return telemetry.Error(ctx, span, err, fmt.Sprintf("error while creating customer with plan %s", planID))
	}

	subscriptionID := m.generateSubscriptionID(projectID, sandboxEnabled)

	err = m.addCustomerPlan(ctx, customerID, planID, subscriptionID)

	return err
}

// createCustomer will create the customer in Metronome
func (m LagoClient) createCustomer(ctx context.Context, userEmail string, projectName string, projectID uint, billingID string, sandboxEnabled bool) (customerID string, err error) {
	ctx, span := telemetry.NewSpan(ctx, "create-metronome-customer")
	defer span.End()

	customerID = m.generateCustomerID(projectID, sandboxEnabled)

	customerInput := &lago.CustomerInput{
		ExternalID: customerID,
		Name:       projectName,
		Email:      userEmail,
		BillingConfiguration: lago.CustomerBillingConfigurationInput{
			PaymentProvider:    "stripe",
			ProviderCustomerID: billingID,
		},
	}

	_, lagoErr := m.client.Customer().Create(ctx, customerInput)
	if err != nil {
		return customerID, telemetry.Error(ctx, span, lagoErr.Err, "failed to create lago customer")
	}
	return customerID, nil
}

// addCustomerPlan will create a plan subscription for the customer
func (m LagoClient) addCustomerPlan(ctx context.Context, projectID string, planID string, subscriptionID string) (err error) {
	ctx, span := telemetry.NewSpan(ctx, "add-metronome-customer-plan")
	defer span.End()

	if projectID == "" || planID == "" {
		return telemetry.Error(ctx, span, err, "project and plan id are required")
	}

	now := time.Now()
	subscriptionInput := &lago.SubscriptionInput{
		ExternalCustomerID: projectID,
		ExternalID:         subscriptionID,
		PlanCode:           planID,
		SubscriptionAt:     &now,
		BillingTime:        lago.Calendar,
	}

	_, lagoErr := m.client.Subscription().Create(ctx, subscriptionInput)
	if err != nil {
		return telemetry.Error(ctx, span, lagoErr.Err, "failed to create subscription")
	}

	return nil
}

// ListCustomerPlan will return the current active plan to which the user is subscribed
func (m LagoClient) ListCustomerPlan(ctx context.Context, subscriptionID string) (plan types.Plan, err error) {
	ctx, span := telemetry.NewSpan(ctx, "list-customer-plans")
	defer span.End()

	if subscriptionID == "" {
		return plan, telemetry.Error(ctx, span, err, "subscription id empty")
	}

	subscription, lagoErr := m.client.Subscription().Get(ctx, subscriptionID)
	if err != nil {
		return plan, telemetry.Error(ctx, span, lagoErr.Err, "failed to create subscription")
	}

	plan.StartingOn = subscription.StartedAt.Format(time.RFC3339)
	plan.EndingBefore = subscription.EndingAt.Format(time.RFC3339)
	plan.TrialInfo.EndingBefore = subscription.TrialEndedAt.Format(time.RFC3339)

	return plan, nil
}

// EndCustomerPlan will immediately end the plan for the given customer
func (m LagoClient) EndCustomerPlan(ctx context.Context, subscriptionID string) (err error) {
	ctx, span := telemetry.NewSpan(ctx, "end-metronome-customer-plan")
	defer span.End()

	if subscriptionID == "" {
		return telemetry.Error(ctx, span, err, "subscription id empty")
	}

	subscriptionTerminateInput := lago.SubscriptionTerminateInput{
		ExternalID: subscriptionID,
	}

	_, lagoErr := m.client.Subscription().Terminate(ctx, subscriptionTerminateInput)
	if lagoErr.Err != nil {
		return telemetry.Error(ctx, span, lagoErr.Err, "failed to terminate subscription")
	}

	return nil
}

// ListCustomerCredits will return the total number of credits for the customer
func (m LagoClient) ListCustomerCredits(ctx context.Context, customerID string) (credits types.ListCreditGrantsResponse, err error) {
	ctx, span := telemetry.NewSpan(ctx, "list-customer-credits")
	defer span.End()

	if customerID == "" {
		return credits, telemetry.Error(ctx, span, err, "customer id empty")
	}

	walletListInput := &lago.WalletListInput{
		ExternalCustomerID: customerID,
	}

	walletList, lagoErr := m.client.Wallet().GetList(ctx, walletListInput)
	if lagoErr.Err != nil {
		return credits, telemetry.Error(ctx, span, lagoErr.Err, "failed to get wallet")
	}

	var response types.ListCreditGrantsResponse
	for _, wallet := range walletList.Wallets {
		response.GrantedBalanceCents += wallet.BalanceCents
		response.RemainingBalanceCents += wallet.OngoingUsageBalanceCents
	}

	return response, nil
}

// CreateCreditsGrant will create a new credit grant for the customer with the specified amount
func (m LagoClient) CreateCreditsGrant(ctx context.Context, customerID string, reason string, grantAmount float64, expiresAt string) (err error) {
	ctx, span := telemetry.NewSpan(ctx, "create-credits-grant")
	defer span.End()

	if customerID == "" {
		return telemetry.Error(ctx, span, err, "customer id empty")
	}

	expiresAtTime, err := time.Parse(time.RFC3339, expiresAt)
	if err != nil {
		return telemetry.Error(ctx, span, err, "failed to parse credit expiration timestamp")
	}

	walletInput := &lago.WalletInput{
		ExternalCustomerID: customerID,
		Currency:           lago.USD,
		RateAmount:         fmt.Sprintf("%.2f", grantAmount),
		ExpirationAt:       &expiresAtTime,
	}

	_, lagoErr := m.client.Wallet().Create(ctx, walletInput)
	if lagoErr.Err != nil {
		return telemetry.Error(ctx, span, lagoErr.Err, "failed to create credits grant")
	}

	return nil
}

// ListCustomerUsage will return the aggregated usage for a customer
func (m LagoClient) ListCustomerUsage(ctx context.Context, customerID uuid.UUID, startingOn string, endingBefore string, windowsSize string, currentPeriod bool) (usage []types.Usage, err error) {
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

	startingOnTimestamp, endingBeforeTimestamp, err := parseAndCheckTimestamps(startingOn, endingBefore)
	if err != nil {
		return nil, telemetry.Error(ctx, span, err, err.Error())
	}

	baseReq := types.ListCustomerUsageRequest{
		CustomerID:    customerID,
		WindowSize:    windowsSize,
		StartingOn:    startingOnTimestamp,
		EndingBefore:  endingBeforeTimestamp,
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
		_, err = m.do(http.MethodPost, path, "", baseReq, &result)
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

// ListCustomerCosts will return the costs for a customer over a time period
func (m LagoClient) ListCustomerCosts(ctx context.Context, customerID uuid.UUID, startingOn string, endingBefore string, limit int) (costs []types.FormattedCost, err error) {
	ctx, span := telemetry.NewSpan(ctx, "list-customer-costs")
	defer span.End()

	if customerID == uuid.Nil {
		return costs, telemetry.Error(ctx, span, err, "customer id empty")
	}

	path := fmt.Sprintf("customers/%s/costs", customerID)

	var result struct {
		Data []types.Cost `json:"data"`
	}

	startingOnTimestamp, endingBeforeTimestamp, err := parseAndCheckTimestamps(startingOn, endingBefore)
	if err != nil {
		return nil, telemetry.Error(ctx, span, err, err.Error())
	}

	queryParams := fmt.Sprintf("starting_on=%s&ending_before=%s&limit=%d", startingOnTimestamp, endingBeforeTimestamp, limit)

	_, err = m.do(http.MethodGet, path, queryParams, nil, &result)
	if err != nil {
		return costs, telemetry.Error(ctx, span, err, "failed to create credits grant")
	}

	for _, customerCost := range result.Data {
		formattedCost := types.FormattedCost{
			StartTimestamp: customerCost.StartTimestamp,
			EndTimestamp:   customerCost.EndTimestamp,
		}
		for _, creditType := range customerCost.CreditTypes {
			formattedCost.Cost += creditType.Cost
		}
		costs = append(costs, formattedCost)
	}

	return costs, nil
}

// IngestEvents sends a list of billing events to Metronome's ingest endpoint
func (m LagoClient) IngestEvents(ctx context.Context, events []types.BillingEvent) (err error) {
	ctx, span := telemetry.NewSpan(ctx, "ingets-billing-events")
	defer span.End()

	if len(events) == 0 {
		return nil
	}

	path := "ingest"

	for i := 0; i < len(events); i += maxIngestEventLimit {
		end := i + maxIngestEventLimit
		if end > len(events) {
			end = len(events)
		}

		batch := events[i:end]

		// Retry each batch to make sure all events are ingested
		var currentAttempts int
		for currentAttempts < defaultMaxRetries {
			statusCode, err := m.do(http.MethodPost, path, "", batch, nil)
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
			if statusCode == http.StatusOK {
				break
			}
			currentAttempts++
		}

		if currentAttempts == defaultMaxRetries {
			return telemetry.Error(ctx, span, err, "max number of retry attempts reached with no success")
		}
	}

	return nil
}

func (m LagoClient) listBillableMetricIDs(ctx context.Context, customerID uuid.UUID) (billableMetrics []types.BillableMetric, err error) {
	ctx, span := telemetry.NewSpan(ctx, "list-billable-metrics")
	defer span.End()

	if customerID == uuid.Nil {
		return billableMetrics, telemetry.Error(ctx, span, err, "customer id empty")
	}

	path := fmt.Sprintf("/customers/%s/billable-metrics", customerID)

	var result struct {
		Data []types.BillableMetric `json:"data"`
	}

	_, err = m.do(http.MethodGet, path, "", nil, &result)
	if err != nil {
		return billableMetrics, telemetry.Error(ctx, span, err, "failed to retrieve billable metrics from metronome")
	}

	return result.Data, nil
}

func (m LagoClient) generateCustomerID(projectID uint, sandboxEnabled bool) string {
	if sandboxEnabled {
		return fmt.Sprintf("cloud_cus_%d", projectID)
	}

	return fmt.Sprintf("cus_%d", projectID)
}

func (m LagoClient) generateSubscriptionID(projectID uint, sandboxEnabled bool) string {
	if sandboxEnabled {
		return fmt.Sprintf("cloud_sub_%d", projectID)
	}

	return fmt.Sprintf("sub_%d", projectID)
}
