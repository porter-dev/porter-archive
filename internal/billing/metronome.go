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

type MetronomeClient struct {
	ApiKey string
}

func NewMetronomeClient(metronomeApiKey string) *MetronomeClient {
	return &MetronomeClient{
		ApiKey: metronomeApiKey,
	}
}

func (m *MetronomeClient) CreateCustomer(orgName string, projectName string, projectID uint, billingID string) (customerID uuid.UUID, err error) {
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

	err = post(path, http.MethodPost, m.ApiKey, customer, &result)
	if err != nil {
		return customerID, err
	}
	return result.Data.ID, nil
}

func (m *MetronomeClient) DeleteCustomer(customerID uuid.UUID) (err error) {
	if customerID == uuid.Nil {
		return fmt.Errorf("customer id cannot be empty")
	}
	path := "/customers/archive"

	req := types.CustomerArchiveRequest{
		CustomerID: customerID,
	}

	err = post(path, http.MethodPost, m.ApiKey, req, nil)
	if err != nil {
		return err
	}

	return nil
}

func (m *MetronomeClient) AddCustomerPlan(customerID uuid.UUID, planID uuid.UUID) (customerPlanID uuid.UUID, err error) {
	if customerID == uuid.Nil || planID == uuid.Nil {
		return customerPlanID, fmt.Errorf("customer or plan id empty")
	}

	path := fmt.Sprintf("/customers/%s/plans/add", customerID)

	// Plan start time must be midnight UTC, formatted as RFC3339 timestamp
	now := time.Now()
	midnightUTC := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
	startOn := midnightUTC.Format(time.RFC3339)

	req := types.AddCustomerPlanRequest{
		PlanID:     planID,
		StartingOn: startOn,
	}

	var result types.AddCustomerPlanResponse

	err = post(path, http.MethodPost, m.ApiKey, req, result)
	if err != nil {
		return customerPlanID, err
	}

	return result.Data.CustomerPlanID, nil
}

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
		EndingBefore: endBefore,
	}

	err = post(path, http.MethodPost, m.ApiKey, req, nil)
	if err != nil {
		return err
	}

	return nil
}

func post(path string, method string, apiKey string, body interface{}, data interface{}) (err error) {
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

	req, err := http.NewRequest(method, endpoint, bytes.NewBuffer(bodyJson))
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
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("non 200 status code returned: %d", resp.StatusCode)
	}

	if data != nil {
		err = json.NewDecoder(resp.Body).Decode(data)
		if err != nil {
			return err
		}
	}

	return nil
}
