package billing

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/getlago/lago-go-client"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/telemetry"
)

const (
	defaultStarterCreditsCents = 500
	defaultRewardAmountCents   = 1000
	maxReferralRewards         = 10
	defaultMaxRetries          = 10
	maxIngestEventLimit        = 100

	// porterStandardTrialDays is the number of days for the trial
	porterStandardTrialDays = 15

	// These prefixes are used to build the customer and subscription IDs
	// in Lago. This way we can reuse the project IDs instead of storing
	// the Lago IDs in the database.

	// TrialIDPrefix is the prefix for the trial ID
	TrialIDPrefix = "trial"
	// SubscriptionIDPrefix is the prefix for the subscription ID
	SubscriptionIDPrefix = "sub"
	// CustomerIDPrefix is the prefix for the customer ID
	CustomerIDPrefix = "cus"
)

// LagoClient is the client used to call the Lago API
type LagoClient struct {
	client                 lago.Client
	lagoApiKey             string
	PorterCloudPlanCode    string
	PorterStandardPlanCode string
	PorterTrialCode        string

	// DefaultRewardAmountCents is the default amount in USD cents rewarded to users
	// who successfully refer a new user
	DefaultRewardAmountCents int64
	// MaxReferralRewards is the maximum number of referral rewards a user can receive
	MaxReferralRewards int64
}

// NewLagoClient returns a new Lago client
func NewLagoClient(lagoApiKey string, porterCloudPlanCode string, porterStandardPlanCode string, porterTrialCode string) (client LagoClient, err error) {
	lagoClient := lago.New().SetApiKey(lagoApiKey)

	if lagoClient == nil {
		return client, fmt.Errorf("failed to create lago client")
	}
	// lagoClient.Debug = true

	return LagoClient{
		lagoApiKey:               lagoApiKey,
		client:                   *lagoClient,
		PorterCloudPlanCode:      porterCloudPlanCode,
		PorterStandardPlanCode:   porterStandardPlanCode,
		PorterTrialCode:          porterTrialCode,
		DefaultRewardAmountCents: defaultRewardAmountCents,
		MaxReferralRewards:       maxReferralRewards,
	}, nil
}

// CreateCustomerWithPlan will create the customer in Lago and immediately add it to the plan
func (m LagoClient) CreateCustomerWithPlan(ctx context.Context, userEmail string, projectName string, projectID uint, billingID string, sandboxEnabled bool) (err error) {
	ctx, span := telemetry.NewSpan(ctx, "add-lago-customer-plan")
	defer span.End()

	if projectID == 0 {
		return telemetry.Error(ctx, span, err, "project id empty")
	}

	customerID, err := m.createCustomer(ctx, userEmail, projectName, projectID, billingID, sandboxEnabled)
	if err != nil {
		return telemetry.Error(ctx, span, err, "error while creating customer")
	}

	trialID := m.generateLagoID(TrialIDPrefix, projectID, sandboxEnabled)
	subscriptionID := m.generateLagoID(SubscriptionIDPrefix, projectID, sandboxEnabled)

	// The dates need to be at midnight UTC
	now := time.Now().UTC()
	now = time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
	trialEndTime := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC).Add(time.Hour * 24 * porterStandardTrialDays).UTC()

	if sandboxEnabled {
		err = m.addCustomerPlan(ctx, customerID, m.PorterCloudPlanCode, subscriptionID, &now, nil)
		if err != nil {
			return telemetry.Error(ctx, span, err, fmt.Sprintf("error while adding customer to plan %s", m.PorterCloudPlanCode))
		}

		starterWalletName := "Free Starter Credits"
		expiresAt := time.Now().UTC().AddDate(0, 1, 0).Truncate(24 * time.Hour)

		err = m.CreateCreditsGrant(ctx, projectID, starterWalletName, defaultStarterCreditsCents, &expiresAt, sandboxEnabled)
		if err != nil {
			return telemetry.Error(ctx, span, err, "error while creating starter credits grant")
		}
		return nil
	}

	// First, start the new customer on the trial
	err = m.addCustomerPlan(ctx, customerID, m.PorterTrialCode, trialID, &now, &trialEndTime)
	if err != nil {
		return telemetry.Error(ctx, span, err, fmt.Sprintf("error while starting customer trial %s", m.PorterTrialCode))
	}

	// Then, add the customer to the actual plan. The date of the subscription will be the end of the trial
	err = m.addCustomerPlan(ctx, customerID, m.PorterStandardPlanCode, subscriptionID, &trialEndTime, nil)
	if err != nil {
		return telemetry.Error(ctx, span, err, fmt.Sprintf("error while adding customer to plan %s", m.PorterStandardPlanCode))
	}

	return err
}

// CheckIfCustomerExists will check if the customer exists in Lago
func (m LagoClient) CheckIfCustomerExists(ctx context.Context, projectID uint, enableSandbox bool) (exists bool, err error) {
	ctx, span := telemetry.NewSpan(ctx, "check-lago-customer-exists")
	defer span.End()

	if projectID == 0 {
		return exists, telemetry.Error(ctx, span, err, "project id empty")
	}

	customerID := m.generateLagoID(CustomerIDPrefix, projectID, enableSandbox)
	_, lagoErr := m.client.Customer().Get(ctx, customerID)
	if lagoErr != nil {
		return exists, telemetry.Error(ctx, span, fmt.Errorf(lagoErr.ErrorCode), "failed to get customer")
	}

	return true, nil
}

// GetCustomeActivePlan will return the active plan for the customer
func (m LagoClient) GetCustomeActivePlan(ctx context.Context, projectID uint, sandboxEnabled bool) (plan types.Plan, err error) {
	ctx, span := telemetry.NewSpan(ctx, "get-active-subscription")
	defer span.End()

	if projectID == 0 {
		return plan, telemetry.Error(ctx, span, err, "project id empty")
	}

	if sandboxEnabled {
		subscriptionID := m.generateLagoID(SubscriptionIDPrefix, projectID, sandboxEnabled)
		return types.Plan{ID: subscriptionID}, nil
	}

	customerID := m.generateLagoID(CustomerIDPrefix, projectID, sandboxEnabled)
	subscriptionListInput := lago.SubscriptionListInput{
		ExternalCustomerID: customerID,
	}

	activeSubscriptions, lagoErr := m.client.Subscription().GetList(ctx, subscriptionListInput)
	if lagoErr != nil {
		return plan, telemetry.Error(ctx, span, fmt.Errorf(lagoErr.ErrorCode), "failed to get active subscription")
	}

	if activeSubscriptions == nil {
		return plan, telemetry.Error(ctx, span, err, "no active subscriptions found")
	}

	for _, subscription := range activeSubscriptions.Subscriptions {
		if subscription.Status != lago.SubscriptionStatusActive {
			continue
		}

		plan.ID = subscription.ExternalID
		plan.CustomerID = subscription.ExternalCustomerID
		plan.StartingOn = subscription.SubscriptionAt.Format(time.RFC3339)
		plan.EndingBefore = subscription.EndingAt.Format(time.RFC3339)

		if strings.Contains(subscription.ExternalID, TrialIDPrefix) {
			plan.TrialInfo.EndingBefore = subscription.EndingAt.Format(time.RFC3339)
		}

		break
	}

	return plan, nil
}

// EndCustomerPlan will immediately end the plan for the given customer
func (m LagoClient) EndCustomerPlan(ctx context.Context, projectID uint) (err error) {
	ctx, span := telemetry.NewSpan(ctx, "end-lago-customer-plan")
	defer span.End()

	if projectID == 0 {
		return telemetry.Error(ctx, span, err, "subscription id empty")
	}

	subscriptionID := m.generateLagoID(SubscriptionIDPrefix, projectID, false)
	subscriptionTerminateInput := lago.SubscriptionTerminateInput{
		ExternalID: subscriptionID,
	}

	_, lagoErr := m.client.Subscription().Terminate(ctx, subscriptionTerminateInput)
	if lagoErr != nil {
		return telemetry.Error(ctx, span, fmt.Errorf(lagoErr.ErrorCode), "failed to terminate subscription")
	}

	return nil
}

// ListCustomerCredits will return the total number of credits for the customer
func (m LagoClient) ListCustomerCredits(ctx context.Context, projectID uint, sandboxEnabled bool) (credits types.ListCreditGrantsResponse, err error) {
	ctx, span := telemetry.NewSpan(ctx, "list-customer-credits")
	defer span.End()

	if projectID == 0 {
		return credits, telemetry.Error(ctx, span, err, "project id empty")
	}
	customerID := m.generateLagoID(CustomerIDPrefix, projectID, sandboxEnabled)

	// We manually do the request in this function because the Lago client has an issue
	// with types for this specific request
	lagoBaseURL := "https://api.getlago.com"
	url := fmt.Sprintf("%s/api/v1/wallets?external_customer_id=%s", lagoBaseURL, customerID)
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return credits, telemetry.Error(ctx, span, err, "failed to create wallets request")
	}

	req.Header.Set("Authorization", "Bearer "+m.lagoApiKey)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return credits, telemetry.Error(ctx, span, err, "failed to get customer credits")
	}

	type ListWalletsResponse struct {
		Wallets []types.Wallet `json:"wallets"`
	}

	var walletList ListWalletsResponse
	err = json.NewDecoder(resp.Body).Decode(&walletList)
	if err != nil {
		return credits, telemetry.Error(ctx, span, err, "failed to decode wallet list response")
	}

	var response types.ListCreditGrantsResponse
	for _, wallet := range walletList.Wallets {
		if wallet.Status != string(lago.Active) {
			continue
		}

		response.GrantedBalanceCents += wallet.BalanceCents
		response.RemainingBalanceCents += wallet.OngoingBalanceCents
	}

	err = resp.Body.Close()
	if err != nil {
		return credits, telemetry.Error(ctx, span, err, "failed to close response body")
	}

	return response, nil
}

// CreateCreditsGrant will create a new credit grant for the customer with the specified amount
func (m LagoClient) CreateCreditsGrant(ctx context.Context, projectID uint, name string, grantAmount int64, expiresAt *time.Time, sandboxEnabled bool) (err error) {
	ctx, span := telemetry.NewSpan(ctx, "create-credits-grant")
	defer span.End()

	if projectID == 0 {
		return telemetry.Error(ctx, span, err, "project id empty")
	}

	customerID := m.generateLagoID(CustomerIDPrefix, projectID, sandboxEnabled)
	walletInput := &lago.WalletInput{
		ExternalCustomerID: customerID,
		Name:               name,
		Currency:           lago.USD,
		GrantedCredits:     strconv.FormatInt(grantAmount, 10),
		// Rate is 1 credit = 1 cent
		RateAmount:   "0.01",
		ExpirationAt: expiresAt,
	}

	_, lagoErr := m.client.Wallet().Create(ctx, walletInput)
	if lagoErr != nil {
		return telemetry.Error(ctx, span, fmt.Errorf(lagoErr.ErrorCode), "failed to create credits grant")
	}

	return nil
}

// ListCustomerUsage will return the aggregated usage for a customer
func (m LagoClient) ListCustomerUsage(ctx context.Context, customerID string, subscriptionID string, currentPeriod bool) (usage types.Usage, err error) {
	ctx, span := telemetry.NewSpan(ctx, "list-customer-usage")
	defer span.End()

	if subscriptionID == "" {
		return usage, telemetry.Error(ctx, span, err, "subscription id empty")
	}

	if currentPeriod {
		customerUsageInput := &lago.CustomerUsageInput{
			ExternalSubscriptionID: subscriptionID,
		}

		currentUsage, lagoErr := m.client.Customer().CurrentUsage(ctx, customerID, customerUsageInput)
		if lagoErr != nil {
			return usage, telemetry.Error(ctx, span, fmt.Errorf(lagoErr.ErrorCode), "failed to get customer usage")
		}

		usage.FromDatetime = currentUsage.FromDatetime.Format(time.RFC3339)
		usage.ToDatetime = currentUsage.ToDatetime.Format(time.RFC3339)
		usage.TotalAmountCents = int64(currentUsage.TotalAmountCents)
		usage.ChargesUsage = make([]types.ChargeUsage, len(currentUsage.ChargesUsage))

		for i, charge := range currentUsage.ChargesUsage {
			usage.ChargesUsage[i] = types.ChargeUsage{
				Units:          charge.Units,
				AmountCents:    int64(charge.AmountCents),
				AmountCurrency: string(charge.AmountCurrency),
				BillableMetric: types.BillableMetric{
					Name: charge.BillableMetric.Name,
				},
			}
		}
	}

	return usage, nil
}

// IngestEvents sends a list of billing events to Lago's ingest endpoint
func (m LagoClient) IngestEvents(ctx context.Context, subscriptionID string, events []types.BillingEvent, enableSandbox bool) (err error) {
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
			externalSubscriptionID := subscriptionID
			if enableSandbox {
				// This hack has to be done because we can't infer the project id from the
				// context in Porter Cloud
				customerID, err := strconv.ParseUint(batch[i].CustomerID, 10, 64)
				if err != nil {
					return telemetry.Error(ctx, span, err, "failed to parse customer ID")
				}
				externalSubscriptionID = m.generateLagoID(SubscriptionIDPrefix, uint(customerID), enableSandbox)
			}

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

// ListCustomerFinalizedInvoices will return all finalized invoices for the customer
func (m LagoClient) ListCustomerFinalizedInvoices(ctx context.Context, projectID uint, enableSandbox bool) (invoiceList []types.Invoice, err error) {
	ctx, span := telemetry.NewSpan(ctx, "list-customer-invoices")
	defer span.End()

	if projectID == 0 {
		return invoiceList, telemetry.Error(ctx, span, err, "project id cannot be empty")
	}

	customerID := m.generateLagoID(CustomerIDPrefix, projectID, enableSandbox)
	invoiceListInput := &lago.InvoiceListInput{
		ExternalCustomerID: customerID,
		Status:             lago.InvoiceStatusFinalized,
	}

	invoices, lagoErr := m.client.Invoice().GetList(ctx, invoiceListInput)
	if lagoErr != nil {
		return invoiceList, telemetry.Error(ctx, span, fmt.Errorf(lagoErr.ErrorCode), "failed to list invoices")
	}

	for _, invoice := range invoices.Invoices {
		invoiceReq, lagoErr := m.client.Invoice().Download(ctx, invoice.LagoID.String())
		if lagoErr != nil {
			return invoiceList, telemetry.Error(ctx, span, fmt.Errorf(lagoErr.ErrorCode), "failed to download invoice")
		}

		var fileURL string
		if invoiceReq == nil {
			fileURL = invoice.FileURL
		} else {
			fileURL = invoiceReq.FileURL
		}

		invoiceList = append(invoiceList, types.Invoice{
			HostedInvoiceURL: fileURL,
			Status:           string(invoice.Status),
			Created:          invoice.IssuingDate,
		})
	}

	return invoiceList, nil
}

// createCustomer will create the customer in Lago
func (m LagoClient) createCustomer(ctx context.Context, userEmail string, projectName string, projectID uint, billingID string, sandboxEnabled bool) (customerID string, err error) {
	ctx, span := telemetry.NewSpan(ctx, "create-lago-customer")
	defer span.End()

	customerID = m.generateLagoID(CustomerIDPrefix, projectID, sandboxEnabled)

	customerInput := &lago.CustomerInput{
		ExternalID: customerID,
		Name:       projectName,
		Email:      userEmail,
		BillingConfiguration: lago.CustomerBillingConfigurationInput{
			PaymentProvider:    lago.PaymentProviderStripe,
			ProviderCustomerID: billingID,
			Sync:               false,
			SyncWithProvider:   false,
		},
	}

	_, lagoErr := m.client.Customer().Create(ctx, customerInput)
	if lagoErr != nil {
		return customerID, telemetry.Error(ctx, span, fmt.Errorf(lagoErr.ErrorCode), "failed to create lago customer")
	}
	return customerID, nil
}

// addCustomerPlan will create a plan subscription for the customer
func (m LagoClient) addCustomerPlan(ctx context.Context, customerID string, planID string, subscriptionID string, startingAt *time.Time, endingAt *time.Time) (err error) {
	ctx, span := telemetry.NewSpan(ctx, "add-lago-customer-plan")
	defer span.End()

	if customerID == "" || planID == "" {
		return telemetry.Error(ctx, span, err, "project and plan id are required")
	}

	subscriptionInput := &lago.SubscriptionInput{
		ExternalCustomerID: customerID,
		ExternalID:         subscriptionID,
		PlanCode:           planID,
		SubscriptionAt:     startingAt,
		EndingAt:           endingAt,
		BillingTime:        lago.Calendar,
	}

	_, lagoErr := m.client.Subscription().Create(ctx, subscriptionInput)
	if lagoErr != nil {
		return telemetry.Error(ctx, span, fmt.Errorf(lagoErr.ErrorCode), "failed to create subscription")
	}

	return nil
}

func (m LagoClient) generateLagoID(prefix string, projectID uint, sandboxEnabled bool) string {
	if sandboxEnabled {
		return fmt.Sprintf("cloud_%s_%d", prefix, projectID)
	}

	return fmt.Sprintf("%s_%d", prefix, projectID)
}
