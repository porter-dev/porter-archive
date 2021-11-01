// +build ee

package billing

type Team struct {
	ID           string       `json:"id"`
	ProviderID   string       `json:"provider_id"`
	Name         string       `json:"name"`
	Members      []Teammate   `json:"members"`
	Subscription Subscription `json:"subscription"`
}

type RoleEnum string

const (
	RoleEnumOwner  RoleEnum = "owner"
	RoleEnumMember RoleEnum = "member"
)

type Teammate struct {
	ID         string   `json:"id"`
	CustomerID string   `json:"customer_id"`
	Role       RoleEnum `json:"role"`
	Email      string   `json:"email"`
}

type Subscription struct {
	ID       string `json:"id"`
	Plan     Plan   `json:"plan"`
	IsActive bool   `json:"is_active"`
}

type Plan struct {
	ID         string        `json:"id"`
	ProviderID string        `json:"string"`
	Name       string        `json:"name"`
	IsActive   bool          `json:"is_active"`
	Features   []PlanFeature `json:"features"`
}

type CreatePlanRequest struct {
	Name               string                   `json:"name"`
	IsActive           bool                     `json:"is_active"`
	IsPublic           bool                     `json:"is_public"`
	IsTrialAllowed     bool                     `json:"is_trial_allowed"`
	PerMonthPriceCents uint                     `json:"per_month_price_cents"`
	PerYearPriceCents  uint                     `json:"per_year_price_cents"`
	ReplacePlanID      *string                  `json:"replace_plan_id"`
	Features           []*CreatePlanFeature     `json:"features"`
	TeamsAccess        []*CreatePlanTeamsAccess `json:"teams_access"`
}

type CreatePlanFeature struct {
	FeatureID string `json:"feature_id"`
	SpecID    string `json:"spec_id"`
	Display   string `json:"display"`
	Sort      uint   `json:"sort"`
	IsActive  bool   `json:"is_active"`
}

type CreatePlanTeamsAccess struct {
	TeamID string `json:"team_id"`
	Revoke bool   `json:"revoke"`
}

type CreateFeatureSpecRequest struct {
	Name          string `json:"name"`
	RecordPeriod  string `json:"record_period"`
	Aggregation   string `json:"aggregation"`
	MaxLimit      uint   `json:"max_limit"`
	UnitPrice     uint   `json:"unit_price"`
	UnitsIncluded uint   `json:"units_included"`
}

type CreateFeaturespecResponse struct {
	*CreateFeatureSpecRequest
	ID string `json:"id"`
}

type ListFeaturesResponse struct {
	Results []Feature `json:"results"`
}

type ListPlansResponse struct {
	Results []Plan `json:"results"`
}

type PlanFeature struct {
	ID          string      `json:"id"`
	IsActive    bool        `json:"is_active"`
	Feature     Feature     `json:"feature"`
	FeatureSpec FeatureSpec `json:"spec"`
}

type Feature struct {
	ID   string `json:"id"`
	Slug string `json:"slug"`
}

type FeatureSpec struct {
	ID         string `json:"id"`
	Name       string `json:"name"`
	MaxLimit   int64  `json:"max_limit"`
	ProviderID string `json:"provider_id"`
}

type CreateTeamRequest struct {
	Name string `json:"name"`
}

type AddTeammateRequest struct {
	Role     RoleEnum `json:"role"`
	Email    string   `json:"email"`
	SourceID string   `json:"source_id"`
	TeamID   string   `json:"team_id"`
}

type UpdateTeammateRequest struct {
	Role RoleEnum `json:"role"`
}

type CreateIDTokenRequest struct {
	Email  string `json:"customer_email"`
	UserID string `json:"customer_source_id"`
}

type CreateIDTokenResponse struct {
	Token string `json:"token"`
}

type SubscriptionWebhookRequest struct {
	EventType string `json:"event_type"`
	TeamID    string `json:"team_id"`
	Plan      Plan   `json:"plan"`
}

type CreateSubscriptionRequest struct {
	PlanID     string `json:"plan_id"`
	TeamID     string `json:"team_id"`
	IsPaused   bool   `json:"is_paused"`
	NextPlanID string `json:"next_plan_id"`
}
