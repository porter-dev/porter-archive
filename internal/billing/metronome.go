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
	metronomeBaseUrl         = "https://api.metronome.com/v1/"
	defaultCollectionMethod  = "charge_automatically"
	defaultGrantCredits      = 5000
	defaultGrantName         = "Starter Credits"
	defaultGrantExpiryMonths = 1
)

// MetronomeClient is the client used to call the Metronome API
type MetronomeClient struct {
	ApiKey string
}

// NewMetronomeClient returns a new Metronome client
func NewMetronomeClient(metronomeApiKey string) MetronomeClient {
	return MetronomeClient{
		ApiKey: metronomeApiKey,
	}
}

// createCustomer will create the customer in Metronome
func (m MetronomeClient) createCustomer(ctx context.Context, orgName string, projectName string, projectID uint, billingID string) (customerID uuid.UUID, err error) {
	ctx, span := telemetry.NewSpan(ctx, "create-metronome-customer")
	defer span.End()

	path := "customers"
	projIDStr := strconv.FormatUint(uint64(projectID), 10)

	prefix := "Project"
	if orgName != "" {
		prefix = orgName
	}

	customer := types.Customer{
		Name: fmt.Sprintf("%s - %s", prefix, projectName),
		Aliases: []string{
			projIDStr,
		},
		BillingConfig: types.BillingConfig{
			BillingProviderType:       "stripe",
			BillingProviderCustomerID: billingID,
			StripeCollectionMethod:    defaultCollectionMethod,
		},
	}

	var result struct {
		Data types.Customer `json:"data"`
	}

	err = post(path, m.ApiKey, customer, &result)
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

	err = post(path, m.ApiKey, req, &result)
	if err != nil {
		return customerPlanID, telemetry.Error(ctx, span, err, "failed to add customer to plan")
	}

	return result.Data.CustomerPlanID, nil
}

// CreateCustomerWithPlan will create the customer in Metronome and immediately add it to the plan
func (m MetronomeClient) CreateCustomerWithPlan(ctx context.Context, orgName string, projectName string, projectID uint, billingID string, planID string) (customerID uuid.UUID, customerPlanID uuid.UUID, err error) {
	ctx, span := telemetry.NewSpan(ctx, "add-metronome-customer-plan")
	defer span.End()

	porterCloudPlanID, err := uuid.Parse(planID)
	if err != nil {
		return customerID, customerPlanID, telemetry.Error(ctx, span, err, "error parsing starter plan id")
	}

	customerID, err = m.createCustomer(ctx, orgName, projectName, projectID, billingID)
	if err != nil {
		return customerID, customerPlanID, telemetry.Error(ctx, span, err, "error while creatinc customer with plan")
	}

	customerPlanID, err = m.addCustomerPlan(ctx, customerID, porterCloudPlanID)

	return customerID, customerPlanID, err
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

	err = post(path, m.ApiKey, req, nil)
	if err != nil {
		return telemetry.Error(ctx, span, err, "failed to end customer plan")
	}

	return nil
}

// GetCustomerCredits will return the first credit grant for the customer
func (m MetronomeClient) GetCustomerCredits(ctx context.Context, customerID uuid.UUID) (credits int64, err error) {
	ctx, span := telemetry.NewSpan(ctx, "get-customer-credits")
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

	err = post(path, m.ApiKey, req, &result)
	if err != nil {
		return credits, telemetry.Error(ctx, span, err, "failed to get customer credits")
	}

	return result.Data[0].Balance.IncludingPending, nil
}

func post(path string, apiKey string, body interface{}, data interface{}) (err error) {
	client := http.Client{}
	endpoint, err := url.JoinPath(metronomeBaseUrl, path)
	if err != nil {
		return err
	}

	var bodyJson []byte
	if body != nil {
		bodyJson, err = json.Marshal(body)
		if err != nil {
			return err
		}
	}

	req, err := http.NewRequest(http.MethodPost, endpoint, bytes.NewBuffer(bodyJson))
	if err != nil {
		return err
	}
	bearer := "Bearer " + apiKey
	req.Header.Set("Authorization", bearer)
	req.Header.Set("Content-Type", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		return err
	}

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("non 200 status code returned: %d", resp.StatusCode)
	}

	if data != nil {
		err = json.NewDecoder(resp.Body).Decode(data)
		if err != nil {
			return err
		}
	}
	_ = resp.Body.Close()

	return nil
}
