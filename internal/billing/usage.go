package billing

import (
	"context"
	"fmt"
	"strconv"
	"time"

	"github.com/getlago/lago-go-client"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/telemetry"
)

const (
	defaultRewardAmountCents = 1000
	maxReferralRewards       = 10
	defaultMaxRetries        = 10
	maxIngestEventLimit      = 100

	// These prefixes are used to build the customer and subscription IDs
	// in Lago. This way we can reuse the project IDs instead of storing
	// the Lago IDs in the database.

	// SubscriptionIDPrefix is the prefix for the subscription ID
	SubscriptionIDPrefix = "sub"
	// CustomerIDPrefix is the prefix for the customer ID
	CustomerIDPrefix = "cus"
)

// LagoClient is the client used to call the Lago API
type LagoClient struct {
	client               lago.Client
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

	subscriptionID := m.GenerateLagoID(SubscriptionIDPrefix, projectID, sandboxEnabled)

	err = m.addCustomerPlan(ctx, customerID, planID, subscriptionID)

	return err
}

// createCustomer will create the customer in Metronome
func (m LagoClient) createCustomer(ctx context.Context, userEmail string, projectName string, projectID uint, billingID string, sandboxEnabled bool) (customerID string, err error) {
	ctx, span := telemetry.NewSpan(ctx, "create-metronome-customer")
	defer span.End()

	customerID = m.GenerateLagoID(CustomerIDPrefix, projectID, sandboxEnabled)

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
func (m LagoClient) ListCustomerPlan(ctx context.Context, projectID uint, sandboxEnabled bool) (plan types.Plan, err error) {
	ctx, span := telemetry.NewSpan(ctx, "list-customer-plans")
	defer span.End()

	if projectID == 0 {
		return plan, telemetry.Error(ctx, span, err, "project id empty")
	}

	subscriptionID := m.GenerateLagoID(SubscriptionIDPrefix, projectID, sandboxEnabled)
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
func (m LagoClient) EndCustomerPlan(ctx context.Context, projectID uint) (err error) {
	ctx, span := telemetry.NewSpan(ctx, "end-metronome-customer-plan")
	defer span.End()

	if projectID == 0 {
		return telemetry.Error(ctx, span, err, "subscription id empty")
	}

	subscriptionID := m.GenerateLagoID(SubscriptionIDPrefix, projectID, false)
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
// func (m LagoClient) ListCustomerCredits(ctx context.Context, customerID string) (credits types.ListCreditGrantsResponse, err error) {
// 	ctx, span := telemetry.NewSpan(ctx, "list-customer-credits")
// 	defer span.End()

// 	if customerID == "" {
// 		return credits, telemetry.Error(ctx, span, err, "customer id empty")
// 	}

// 	walletListInput := &lago.WalletListInput{
// 		ExternalCustomerID: customerID,
// 	}

// 	walletList, lagoErr := m.client.Wallet().GetList(ctx, walletListInput)
// 	if lagoErr.Err != nil {
// 		return credits, telemetry.Error(ctx, span, lagoErr.Err, "failed to get wallet")
// 	}

// 	var response types.ListCreditGrantsResponse
// 	for _, wallet := range walletList.Wallets {
// 		response.GrantedBalanceCents += wallet.BalanceCents
// 		response.RemainingBalanceCents += wallet.OngoingUsageBalanceCents
// 	}

// 	return response, nil
// }

// CreateCreditsGrant will create a new credit grant for the customer with the specified amount
func (m LagoClient) CreateCreditsGrant(ctx context.Context, projectID uint, name string, grantAmount int64, expiresAt string, sandboxEnabled bool) (err error) {
	ctx, span := telemetry.NewSpan(ctx, "create-credits-grant")
	defer span.End()

	if projectID == 0 {
		return telemetry.Error(ctx, span, err, "project id empty")
	}

	customerID := m.GenerateLagoID(CustomerIDPrefix, projectID, sandboxEnabled)
	expiresAtTime, err := time.Parse(time.RFC3339, expiresAt)
	if err != nil {
		return telemetry.Error(ctx, span, err, "failed to parse credit expiration timestamp")
	}

	walletInput := &lago.WalletInput{
		ExternalCustomerID: customerID,
		Name:               name,
		Currency:           lago.USD,
		GrantedCredits:     strconv.FormatInt(grantAmount, 10),
		RateAmount:         "1",
		ExpirationAt:       &expiresAtTime,
	}

	_, lagoErr := m.client.Wallet().Create(ctx, walletInput)
	if lagoErr.Err != nil {
		return telemetry.Error(ctx, span, lagoErr.Err, "failed to create credits grant")
	}

	return nil
}

// ListCustomerUsage will return the aggregated usage for a customer
func (m LagoClient) ListCustomerUsage(ctx context.Context, projectID uint, currentPeriod bool, sandboxEnabled bool) (usage []types.Usage, err error) {
	ctx, span := telemetry.NewSpan(ctx, "list-customer-usage")
	defer span.End()

	if projectID == 0 {
		return usage, telemetry.Error(ctx, span, err, "project id empty")
	}

	subscriptionID := m.GenerateLagoID(SubscriptionIDPrefix, projectID, sandboxEnabled)
	customerUsageInput := &lago.CustomerUsageInput{
		ExternalSubscriptionID: subscriptionID,
	}

	customerID := m.GenerateLagoID(CustomerIDPrefix, projectID, sandboxEnabled)
	_, lagoErr := m.client.Customer().CurrentUsage(ctx, customerID, customerUsageInput)
	if lagoErr.Err != nil {
		return usage, telemetry.Error(ctx, span, lagoErr.Err, "failed to get customer usage")
	}

	return usage, nil
}

// IngestEvents sends a list of billing events to Metronome's ingest endpoint
func (m LagoClient) IngestEvents(ctx context.Context, events []types.BillingEvent, enableSandbox bool) (err error) {
	ctx, span := telemetry.NewSpan(ctx, "ingets-billing-events")
	defer span.End()

	if len(events) == 0 {
		return nil
	}

	for i := 0; i < len(events); i += maxIngestEventLimit {
		end := i + maxIngestEventLimit
		if end > len(events) {
			end = len(events)
		}

		batch := events[i:end]
		batchInput := make([]lago.EventInput, len(batch))

		for i := range batch {
			customerID, err := strconv.ParseUint(batch[i].CustomerID, 10, 64)
			if err != nil {
				return telemetry.Error(ctx, span, err, "failed to parse customer ID")
			}
			externalSubscriptionID := m.GenerateLagoID(SubscriptionIDPrefix, uint(customerID), enableSandbox)

			event := lago.EventInput{
				TransactionID:          batch[i].TransactionID,
				ExternalSubscriptionID: externalSubscriptionID,
				Code:                   batch[i].EventType,
				Timestamp:              batch[i].Timestamp,
				Properties:             batch[i].Properties,
			}
			batchInput = append(batchInput, event)
		}

		// Retry each batch to make sure all events are ingested
		var currentAttempts int
		for currentAttempts < defaultMaxRetries {
			m.client.Event().Batch(ctx, &batchInput)
			currentAttempts++
		}

		if currentAttempts == defaultMaxRetries {
			return telemetry.Error(ctx, span, err, "max number of retry attempts reached with no success")
		}
	}

	return nil
}

func (m LagoClient) GenerateLagoID(prefix string, projectID uint, sandboxEnabled bool) string {
	if sandboxEnabled {
		return fmt.Sprintf("cloud_%s_%d", prefix, projectID)
	}

	return fmt.Sprintf("%s_%d", prefix, projectID)
}
