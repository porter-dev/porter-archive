package billing

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"time"

	"github.com/google/uuid"
	"github.com/porter-dev/porter/api/types"
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
func (m *MetronomeClient) createCustomer(orgName string, projectName string, projectID uint, billingID string) (customerID uuid.UUID, err error) {
	path := "customers"
	projIDStr := strconv.FormatUint(uint64(projectID), 10)

	customer := types.Customer{
		Name: fmt.Sprintf("%s - %s", orgName, projectName),
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
		return customerID, err
	}
	return result.Data.ID, nil
}

// addCustomerPlan will start the customer on the given plan
func (m *MetronomeClient) addCustomerPlan(customerID uuid.UUID, planID uuid.UUID) (customerPlanID uuid.UUID, err error) {
	if customerID == uuid.Nil || planID == uuid.Nil {
		return customerPlanID, fmt.Errorf("customer or plan id empty")
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
		return customerPlanID, err
	}

	return result.Data.CustomerPlanID, nil
}

// CreateCustomerWithPlan will create the customer in Metronome and immediately add it to the plan
func (m *MetronomeClient) CreateCustomerWithPlan(orgName string, projectName string, projectID uint, billingID string, planID string) (customerPlanID uuid.UUID, err error) {
	porterCloudPlanID, err := uuid.Parse(planID)
	if err != nil {
		return customerPlanID, fmt.Errorf("error parsing starter plan id: %w", err)
	}

	customerID, err := m.createCustomer(orgName, projectName, projectID, billingID)
	if err != nil {
		return customerPlanID, err
	}

	return m.addCustomerPlan(customerID, porterCloudPlanID)
}

// EndCustomerPlan will immediately end the plan for the given customer
func (m *MetronomeClient) EndCustomerPlan(customerID uuid.UUID, customerPlanID uuid.UUID) (err error) {
	if customerID == uuid.Nil || customerPlanID == uuid.Nil {
		return fmt.Errorf("customer or customer plan id empty")
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
		return err
	}

	return nil
}

// GetCustomerCredits will return the first credit grant for the customer
func (m *MetronomeClient) GetCustomerCredits(customerID uuid.UUID) (credits int64, err error) {
	if customerID == uuid.Nil {
		return credits, fmt.Errorf("customer id empty")
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
		return credits, err
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
