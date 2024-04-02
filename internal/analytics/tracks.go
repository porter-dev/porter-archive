package analytics

import (
	"github.com/porter-dev/porter/api/types"
	segment "gopkg.in/segmentio/analytics-go.v3"
)

type segmentTrack interface {
	getUserId() string
	getEvent() SegmentEvent
	getProperties() segment.Properties
}

type defaultTrackOpts struct {
	AdditionalProps map[string]interface{}
}

type defaultSegmentTrack struct {
	event      SegmentEvent
	properties segmentProperties
}

func getDefaultSegmentTrack(additionalProps map[string]interface{}, event SegmentEvent) *defaultSegmentTrack {
	props := newSegmentProperties()
	props.addAdditionalProperties(additionalProps)

	return &defaultSegmentTrack{
		event:      event,
		properties: props,
	}
}

func (t *defaultSegmentTrack) getEvent() SegmentEvent {
	return t.event
}

func (t *defaultSegmentTrack) getProperties() segment.Properties {
	props := segment.NewProperties()

	for key, val := range t.properties {
		props = props.Set(key, val)
	}

	return props
}

type segmentProperties map[string]interface{}

func newSegmentProperties() segmentProperties {
	props := make(map[string]interface{})

	return props
}

func (p segmentProperties) addProjectProperties(opts *ProjectScopedTrackOpts) {
	p["proj_id"] = opts.ProjectID
}

func (p segmentProperties) addClusterProperties(opts *ClusterScopedTrackOpts) {
	p["cluster_id"] = opts.ClusterID
}

func (p segmentProperties) addRegistryProperties(opts *RegistryScopedTrackOpts) {
	p["registry_id"] = opts.RegistryID
}

func (p segmentProperties) addApplicationProperties(opts *ApplicationScopedTrackOpts) {
	p["app_name"] = opts.Name
	p["app_namespace"] = opts.Namespace
	p["chart_name"] = opts.ChartName
}

func (p segmentProperties) addAdditionalProperties(props map[string]interface{}) {
	for key, val := range props {
		p[key] = val
	}
}

// UserCreateTrackOpts are the options for creating a track when a user is created
type UserCreateTrackOpts struct {
	*UserScopedTrackOpts

	Email          string
	FirstName      string
	LastName       string
	CompanyName    string
	ReferralMethod string
}

// UserCreateTrack returns a track for when a user is created
func UserCreateTrack(opts *UserCreateTrackOpts) segmentTrack {
	additionalProps := make(map[string]interface{})
	additionalProps["email"] = opts.Email
	additionalProps["name"] = opts.FirstName + " " + opts.LastName
	additionalProps["company"] = opts.CompanyName
	additionalProps["referral_method"] = opts.ReferralMethod

	return getSegmentUserTrack(
		opts.UserScopedTrackOpts,
		getDefaultSegmentTrack(additionalProps, UserCreate),
	)
}

// UserCreateTrackOpts are the options for creating a track when a user's email is verified
type UserVerifyEmailTrackOpts struct {
	*UserScopedTrackOpts

	Email string
}

// UserVerifyEmailTrack returns a track for when a user's email is verified
func UserVerifyEmailTrack(opts *UserVerifyEmailTrackOpts) segmentTrack {
	additionalProps := make(map[string]interface{})
	additionalProps["email"] = opts.Email

	return getSegmentUserTrack(
		opts.UserScopedTrackOpts,
		getDefaultSegmentTrack(additionalProps, UserVerifyEmail),
	)
}

// ProjectCreateDeleteTrackOpts are the options for creating a track when a project is created or deleted
type ProjectCreateDeleteTrackOpts struct {
	*ProjectScopedTrackOpts

	Email       string
	FirstName   string
	LastName    string
	CompanyName string
}

// ProjectConnectTrack returns a track for when a project is connected
func ProjectConnectTrack(opts *ProjectCreateDeleteTrackOpts) segmentTrack {
	additionalProps := make(map[string]interface{})

	additionalProps["email"] = opts.Email
	additionalProps["name"] = opts.FirstName + " " + opts.LastName
	additionalProps["company"] = opts.CompanyName

	return getSegmentProjectTrack(
		opts.ProjectScopedTrackOpts,
		getDefaultSegmentTrack(additionalProps, ProjectConnect),
	)
}

// ProjectCreateTrack returns a track for when a project is created
func ProjectCreateTrack(opts *ProjectCreateDeleteTrackOpts) segmentTrack {
	additionalProps := make(map[string]interface{})

	additionalProps["email"] = opts.Email
	additionalProps["name"] = opts.FirstName + " " + opts.LastName
	additionalProps["company"] = opts.CompanyName

	return getSegmentProjectTrack(
		opts.ProjectScopedTrackOpts,
		getDefaultSegmentTrack(additionalProps, ProjectCreate),
	)
}

// ProjectDeleteTrack returns a track for when a project is deleted
func ProjectDeleteTrack(opts *ProjectCreateDeleteTrackOpts) segmentTrack {
	additionalProps := make(map[string]interface{})
	additionalProps["email"] = opts.Email
	additionalProps["name"] = opts.FirstName + " " + opts.LastName
	additionalProps["company"] = opts.CompanyName

	return getSegmentProjectTrack(
		opts.ProjectScopedTrackOpts,
		getDefaultSegmentTrack(additionalProps, ProjectDelete),
	)
}

// PaymentMethodCreateDeleteTrackOpts are the options for creating a track when a payment method is attached/detached
type PaymentMethodCreateDeleteTrackOpts struct {
	*ProjectScopedTrackOpts

	Email       string
	FirstName   string
	LastName    string
	CompanyName string
}

// PaymentMethodAttachedTrack returns a track for when a payment method is attached
func PaymentMethodAttachedTrack(opts *PaymentMethodCreateDeleteTrackOpts) segmentTrack {
	additionalProps := make(map[string]interface{})

	additionalProps["email"] = opts.Email
	additionalProps["name"] = opts.FirstName + " " + opts.LastName
	additionalProps["company"] = opts.CompanyName

	return getSegmentProjectTrack(
		opts.ProjectScopedTrackOpts,
		getDefaultSegmentTrack(additionalProps, PaymentMethodAttached),
	)
}

// PaymentMethodDettachedTrack returns a track for when a payment method is detached
func PaymentMethodDettachedTrack(opts *PaymentMethodCreateDeleteTrackOpts) segmentTrack {
	additionalProps := make(map[string]interface{})

	additionalProps["email"] = opts.Email
	additionalProps["name"] = opts.FirstName + " " + opts.LastName
	additionalProps["company"] = opts.CompanyName

	return getSegmentProjectTrack(
		opts.ProjectScopedTrackOpts,
		getDefaultSegmentTrack(additionalProps, PaymentMethodDettached),
	)
}

// ClusterDeleteTrackOpts are the options for creating a track when a cluster is deleted
type ClusterDeleteTrackOpts struct {
	*ProjectScopedTrackOpts

	Email       string
	FirstName   string
	LastName    string
	CompanyName string
}

// ClusterDeleteTrack returns a track for when a cluster is deleted
func ClusterDeleteTrack(opts *ClusterDeleteTrackOpts) segmentTrack {
	additionalProps := make(map[string]interface{})
	additionalProps["email"] = opts.Email
	additionalProps["name"] = opts.FirstName + " " + opts.LastName
	additionalProps["company"] = opts.CompanyName

	return getSegmentProjectTrack(
		opts.ProjectScopedTrackOpts,
		getDefaultSegmentTrack(additionalProps, ClusterDelete),
	)
}

// CostConsentOpenedTrackOpts are the options for creating a track when a user opens the cost consent
type CostConsentOpenedTrackOpts struct {
	*UserScopedTrackOpts
	Provider    string
	Email       string
	FirstName   string
	LastName    string
	CompanyName string
}

// CostConsentCompletedTrack returns a track for when a user completes the cost consent
func CostConsentOpenedTrack(opts *CostConsentOpenedTrackOpts) segmentTrack {
	additionalProps := make(map[string]interface{})
	additionalProps["provider"] = opts.Provider
	additionalProps["email"] = opts.Email
	additionalProps["name"] = opts.FirstName + " " + opts.LastName
	additionalProps["company"] = opts.CompanyName

	return getSegmentUserTrack(
		opts.UserScopedTrackOpts,
		getDefaultSegmentTrack(additionalProps, CostConsentOpened),
	)
}

// CostConsentCompletedTrackOpts are the options for creating a track when a user completes the cost consent
type CostConsentCompletedTrackOpts struct {
	*UserScopedTrackOpts
	Provider    string
	Email       string
	FirstName   string
	LastName    string
	CompanyName string
}

// CostConsentCompletedTrack returns a track for when a user completes the cost consent
func CostConsentCompletedTrack(opts *CostConsentCompletedTrackOpts) segmentTrack {
	additionalProps := make(map[string]interface{})
	additionalProps["provider"] = opts.Provider
	additionalProps["email"] = opts.Email
	additionalProps["name"] = opts.FirstName + " " + opts.LastName
	additionalProps["company"] = opts.CompanyName

	return getSegmentUserTrack(
		opts.UserScopedTrackOpts,
		getDefaultSegmentTrack(additionalProps, CostConsentComplete),
	)
}

// AWSInputTrackOpts are the options for creating a track when a user inputs a complete AWS account ID
type AWSInputTrackOpts struct {
	*ProjectScopedTrackOpts

	Email       string
	FirstName   string
	LastName    string
	CompanyName string
	AccountId   string
}

// AWSInputTrack returns a track for when a user inputs a complete AWS account ID
func AWSInputTrack(opts *AWSInputTrackOpts) segmentTrack {
	additionalProps := make(map[string]interface{})
	additionalProps["email"] = opts.Email
	additionalProps["name"] = opts.FirstName + " " + opts.LastName
	additionalProps["company"] = opts.CompanyName
	additionalProps["account_id"] = opts.AccountId

	return getSegmentProjectTrack(
		opts.ProjectScopedTrackOpts,
		getDefaultSegmentTrack(additionalProps, AWSInputted),
	)
}

type AWSRedirectOpts struct {
	*ProjectScopedTrackOpts

	Email             string
	FirstName         string
	LastName          string
	CompanyName       string
	AccountId         string
	CloudformationURL string
	LoginURL          string
	ExternalId        string
}

// AWSCloudformationRedirectSuccess returns a track for when a user clicks 'grant permissions' and gets redirected to cloudformation
func AWSCloudformationRedirectSuccess(opts *AWSRedirectOpts) segmentTrack {
	additionalProps := make(map[string]interface{})
	additionalProps["email"] = opts.Email
	additionalProps["name"] = opts.FirstName + " " + opts.LastName
	additionalProps["company"] = opts.CompanyName
	additionalProps["account_id"] = opts.AccountId
	additionalProps["cloudformation_url"] = opts.CloudformationURL
	additionalProps["external_id"] = opts.ExternalId

	return getSegmentProjectTrack(
		opts.ProjectScopedTrackOpts,
		getDefaultSegmentTrack(additionalProps, AWSCloudformationRedirect),
	)
}

// AWSLoginRedirectSuccess returns a track for when a user is prompted to login to AWS
func AWSLoginRedirectSuccess(opts *AWSRedirectOpts) segmentTrack {
	additionalProps := make(map[string]interface{})
	additionalProps["email"] = opts.Email
	additionalProps["name"] = opts.FirstName + " " + opts.LastName
	additionalProps["company"] = opts.CompanyName
	additionalProps["account_id"] = opts.AccountId
	additionalProps["login_url"] = opts.LoginURL

	return getSegmentProjectTrack(
		opts.ProjectScopedTrackOpts,
		getDefaultSegmentTrack(additionalProps, AWSLoginRedirect),
	)
}

type AWSCreateIntegrationOpts struct {
	*ProjectScopedTrackOpts

	Email        string
	FirstName    string
	LastName     string
	CompanyName  string
	AccountId    string
	ExternalId   string
	ErrorMessage string
}

// AWSCreateIntegrationSucceeded returns a track for when a user succeeds in creating an aws integration
func AWSCreateIntegrationSucceeded(opts *AWSCreateIntegrationOpts) segmentTrack {
	additionalProps := make(map[string]interface{})
	additionalProps["email"] = opts.Email
	additionalProps["name"] = opts.FirstName + " " + opts.LastName
	additionalProps["company"] = opts.CompanyName
	additionalProps["account_id"] = opts.AccountId

	return getSegmentProjectTrack(
		opts.ProjectScopedTrackOpts,
		getDefaultSegmentTrack(additionalProps, AWSCreateIntegrationSuccess),
	)
}

// AWSCreateIntegrationSucceeded returns a track for when a user succeeds in creating an aws integration
func AWSCreateIntegrationFailed(opts *AWSCreateIntegrationOpts) segmentTrack {
	additionalProps := make(map[string]interface{})
	additionalProps["email"] = opts.Email
	additionalProps["name"] = opts.FirstName + " " + opts.LastName
	additionalProps["company"] = opts.CompanyName
	additionalProps["account_id"] = opts.AccountId
	additionalProps["error_message"] = opts.ErrorMessage
	additionalProps["external_id"] = opts.ExternalId

	return getSegmentProjectTrack(
		opts.ProjectScopedTrackOpts,
		getDefaultSegmentTrack(additionalProps, AWSCreateIntegrationFailure),
	)
}

// CredentialStepTrackOpts are the options for creating a track when a user completes the credential step
type CredentialStepTrackOpts struct {
	*UserScopedTrackOpts
}

// CredentialStepTrack returns a track for when a user completes the credential step
func CredentialStepTrack(opts *CredentialStepTrackOpts) segmentTrack {
	additionalProps := make(map[string]interface{})

	return getSegmentUserTrack(
		opts.UserScopedTrackOpts,
		getDefaultSegmentTrack(additionalProps, CredentialStepComplete),
	)
}

// PreProvisionCheckTrackOpts are the options for creating a track when a user checks if they can provision
type PreProvisionCheckTrackOpts struct {
	*ProjectScopedTrackOpts

	Email       string
	FirstName   string
	LastName    string
	CompanyName string
}

// PreProvisionCheckTrack returns a track for when a user attempts provisioning
func PreProvisionCheckTrack(opts *PreProvisionCheckTrackOpts) segmentTrack {
	additionalProps := make(map[string]interface{})
	additionalProps["email"] = opts.Email
	additionalProps["name"] = opts.FirstName + " " + opts.LastName
	additionalProps["company"] = opts.CompanyName

	return getSegmentProjectTrack(
		opts.ProjectScopedTrackOpts,
		getDefaultSegmentTrack(additionalProps, PreProvisionCheck),
	)
}

// ProvisioningAttemptedTrackOpts are the options for creating a track when a user attempts provisioning
type ProvisioningAttemptTrackOpts struct {
	*ProjectScopedTrackOpts

	Email        string
	FirstName    string
	LastName     string
	CompanyName  string
	ErrorMessage string
	Region       string
	Provider     string
}

// ProvisioningAttemptTrack returns a track for when a user attempts provisioning
func ProvisioningAttemptTrack(opts *ProvisioningAttemptTrackOpts) segmentTrack {
	additionalProps := make(map[string]interface{})
	additionalProps["email"] = opts.Email
	additionalProps["name"] = opts.FirstName + " " + opts.LastName
	additionalProps["company"] = opts.CompanyName
	additionalProps["region"] = opts.Region
	additionalProps["provider"] = opts.Provider

	return getSegmentProjectTrack(
		opts.ProjectScopedTrackOpts,
		getDefaultSegmentTrack(additionalProps, ProvisioningAttempted),
	)
}

// QuotaIncreaseAttemptTrack returns a track for when a user attempts provisioning
func QuotaIncreaseAttemptTrack(opts *ProvisioningAttemptTrackOpts) segmentTrack {
	additionalProps := make(map[string]interface{})
	additionalProps["email"] = opts.Email
	additionalProps["name"] = opts.FirstName + " " + opts.LastName
	additionalProps["company"] = opts.CompanyName
	additionalProps["region"] = opts.Region
	additionalProps["provider"] = opts.Provider

	return getSegmentProjectTrack(
		opts.ProjectScopedTrackOpts,
		getDefaultSegmentTrack(additionalProps, QuotaIncreaseRequested),
	)
}

// PreProvisionCheckTrack returns a track for when a user attempts provisioning
func ProvisionFailureTrack(opts *ProvisioningAttemptTrackOpts) segmentTrack {
	additionalProps := make(map[string]interface{})
	additionalProps["email"] = opts.Email
	additionalProps["name"] = opts.FirstName + " " + opts.LastName
	additionalProps["company"] = opts.CompanyName
	additionalProps["error_message"] = opts.ErrorMessage
	additionalProps["region"] = opts.Region

	return getSegmentProjectTrack(
		opts.ProjectScopedTrackOpts,
		getDefaultSegmentTrack(additionalProps, ProvisioningFailure),
	)
}

// ClusterProvisioningStartTrackOpts are the options for creating a track when a cluster
// has started provisioning
type ClusterProvisioningStartTrackOpts struct {
	// note that this is a project-scoped track, since the cluster has not been created yet
	*ProjectScopedTrackOpts

	ClusterType types.InfraKind
	InfraID     uint
}

// ClusterProvisioningStartTrack returns a track for when a cluster
// has started provisioning
func ClusterProvisioningStartTrack(opts *ClusterProvisioningStartTrackOpts) segmentTrack {
	additionalProps := make(map[string]interface{})
	additionalProps["cluster_type"] = opts.ClusterType
	additionalProps["infra_id"] = opts.InfraID

	return getSegmentProjectTrack(
		opts.ProjectScopedTrackOpts,
		getDefaultSegmentTrack(additionalProps, ClusterProvisioningStart),
	)
}

// ClusterProvisioningErrorTrackOpts are the options for creating a track when a cluster
// has experienced a provisioning error
type ClusterProvisioningErrorTrackOpts struct {
	// note that this is a project-scoped track, since the cluster has not been created yet
	*ProjectScopedTrackOpts

	ClusterType types.InfraKind
	InfraID     uint
}

// ClusterProvisioningErrorTrack returns a track for when a cluster
// has experienced a provisioning error
func ClusterProvisioningErrorTrack(opts *ClusterProvisioningErrorTrackOpts) segmentTrack {
	additionalProps := make(map[string]interface{})
	additionalProps["cluster_type"] = opts.ClusterType
	additionalProps["infra_id"] = opts.InfraID

	return getSegmentProjectTrack(
		opts.ProjectScopedTrackOpts,
		getDefaultSegmentTrack(additionalProps, ClusterProvisioningError),
	)
}

// ClusterProvisioningSuccessTrackOpts are the options for creating a track when a cluster
// has successfully provisioned
type ClusterProvisioningSuccessTrackOpts struct {
	*ClusterScopedTrackOpts

	ClusterType types.InfraKind
	InfraID     uint
}

// ClusterProvisioningSuccessTrack returns a new track for when a cluster
// has successfully provisioned
func ClusterProvisioningSuccessTrack(opts *ClusterProvisioningSuccessTrackOpts) segmentTrack {
	additionalProps := make(map[string]interface{})
	additionalProps["cluster_type"] = opts.ClusterType
	additionalProps["infra_id"] = opts.InfraID

	return getSegmentClusterTrack(
		opts.ClusterScopedTrackOpts,
		getDefaultSegmentTrack(additionalProps, ClusterProvisioningSuccess),
	)
}

// ClusterConnectionStartTrackOpts are the options for creating a track when a cluster
// connection has started
type ClusterConnectionStartTrackOpts struct {
	// note that this is a project-scoped track, since the cluster has not been created yet
	*ProjectScopedTrackOpts

	ClusterCandidateID uint
}

// ClusterConnectionStartTrack returns a new track for when a cluster
// connection has started
func ClusterConnectionStartTrack(opts *ClusterConnectionStartTrackOpts) segmentTrack {
	additionalProps := make(map[string]interface{})
	additionalProps["cc_id"] = opts.ClusterCandidateID

	return getSegmentProjectTrack(
		opts.ProjectScopedTrackOpts,
		getDefaultSegmentTrack(additionalProps, ClusterConnectionStart),
	)
}

// ClusterConnectionSuccessTrackOpts are the options for creating a track when a cluster
// connection has finished
type ClusterConnectionSuccessTrackOpts struct {
	*ClusterScopedTrackOpts

	ClusterCandidateID uint
}

// ClusterConnectionSuccessTrack returns a new track for when a cluster
// connection has finished
func ClusterConnectionSuccessTrack(opts *ClusterConnectionSuccessTrackOpts) segmentTrack {
	additionalProps := make(map[string]interface{})
	additionalProps["cc_id"] = opts.ClusterCandidateID

	return getSegmentClusterTrack(
		opts.ClusterScopedTrackOpts,
		getDefaultSegmentTrack(additionalProps, ClusterConnectionSuccess),
	)
}

// RegistryConnectionStartTrackOpts are the options for creating a track when a registry
// connection has started
type RegistryConnectionStartTrackOpts struct {
	// note that this is a project-scoped track, since the cluster has not been created yet
	*ProjectScopedTrackOpts

	// a random id assigned to this connection request
	FlowID string
}

// RegistryConnectionStartTrack returns a new track for when a registry
// connection has started
func RegistryConnectionStartTrack(opts *RegistryConnectionStartTrackOpts) segmentTrack {
	additionalProps := make(map[string]interface{})
	additionalProps["flow_id"] = opts.FlowID

	return getSegmentProjectTrack(
		opts.ProjectScopedTrackOpts,
		getDefaultSegmentTrack(additionalProps, RegistryConnectionStart),
	)
}

// RegistryConnectionSuccessTrackOpts are the options for creating a track when a registry
// connection has completed
type RegistryConnectionSuccessTrackOpts struct {
	*RegistryScopedTrackOpts

	// a random id assigned to this connection request
	FlowID string
}

// RegistryConnectionSuccessTrack returns a new track for when a registry
// connection has completed
func RegistryConnectionSuccessTrack(opts *RegistryConnectionSuccessTrackOpts) segmentTrack {
	additionalProps := make(map[string]interface{})
	additionalProps["flow_id"] = opts.FlowID

	return getSegmentRegistryTrack(
		opts.RegistryScopedTrackOpts,
		getDefaultSegmentTrack(additionalProps, RegistryConnectionSuccess),
	)
}

// GithubConnectionStartTrackOpts are the options for creating a track when a github account
// connection has started
type GithubConnectionStartTrackOpts struct {
	// note that this is a user-scoped track, since github repos are tied to the user
	*UserScopedTrackOpts
}

// GithubConnectionStartTrack returns a new track for when a github account
// connection has started
func GithubConnectionStartTrack(opts *GithubConnectionStartTrackOpts) segmentTrack {
	additionalProps := make(map[string]interface{})

	return getSegmentUserTrack(
		opts.UserScopedTrackOpts,
		getDefaultSegmentTrack(additionalProps, GithubConnectionStart),
	)
}

// GithubConnectionSuccessTrackOpts are the options for creating a track when a github account
// connection has completed
type GithubConnectionSuccessTrackOpts struct {
	// note that this is a user-scoped track, since github repos are tied to the user
	*UserScopedTrackOpts
}

// GithubConnectionSuccessTrack returns a new track when a github account
// connection has completed
func GithubConnectionSuccessTrack(opts *GithubConnectionSuccessTrackOpts) segmentTrack {
	additionalProps := make(map[string]interface{})

	return getSegmentUserTrack(
		opts.UserScopedTrackOpts,
		getDefaultSegmentTrack(additionalProps, GithubConnectionSuccess),
	)
}

// ApplicationLaunchStartTrackOpts are the options for creating a track when an application
// launch has started
type ApplicationLaunchStartTrackOpts struct {
	*ClusterScopedTrackOpts

	FlowID string
}

// ApplicationLaunchStartTrack returns a new track for when an application
// launch has started
func ApplicationLaunchStartTrack(opts *ApplicationLaunchStartTrackOpts) segmentTrack {
	additionalProps := make(map[string]interface{})
	additionalProps["flow_id"] = opts.FlowID

	return getSegmentClusterTrack(
		opts.ClusterScopedTrackOpts,
		getDefaultSegmentTrack(additionalProps, ApplicationLaunchStart),
	)
}

// ApplicationLaunchSuccessTrackOpts are the options for creating a track when an application
// launch has completed
type ApplicationLaunchSuccessTrackOpts struct {
	*ApplicationScopedTrackOpts

	FlowID string
}

// ApplicationLaunchSuccessTrack returns a new track for when an application
// launch has completed
func ApplicationLaunchSuccessTrack(opts *ApplicationLaunchSuccessTrackOpts) segmentTrack {
	additionalProps := make(map[string]interface{})
	additionalProps["flow_id"] = opts.FlowID

	return getSegmentApplicationTrack(
		opts.ApplicationScopedTrackOpts,
		getDefaultSegmentTrack(additionalProps, ApplicationLaunchSuccess),
	)
}

// ApplicationDeploymentWebhookTrackOpts are the options for creating a track when an application
// launch has completed from a webhook
type ApplicationDeploymentWebhookTrackOpts struct {
	*ApplicationScopedTrackOpts

	ImageURI string
}

// ApplicationDeploymentWebhookTrack returns a new track for when an application
// launch has completed from a webhook
func ApplicationDeploymentWebhookTrack(opts *ApplicationDeploymentWebhookTrackOpts) segmentTrack {
	additionalProps := make(map[string]interface{})
	additionalProps["image_uri"] = opts.ImageURI

	return getSegmentApplicationTrack(
		opts.ApplicationScopedTrackOpts,
		getDefaultSegmentTrack(additionalProps, ApplicationDeploymentWebhook),
	)
}

// RegistryProvisioningStartTrackOpts are the options for creating a track when a registry
// provisioning has started
type RegistryProvisioningStartTrackOpts struct {
	// note that this is a project-scoped track, since the registry has not been created yet
	*ProjectScopedTrackOpts

	RegistryType types.InfraKind
	InfraID      uint
}

// RegistryProvisioningStartTrack returns a new track for when a registry
// provisioning has started
func RegistryProvisioningStartTrack(opts *RegistryProvisioningStartTrackOpts) segmentTrack {
	additionalProps := make(map[string]interface{})
	additionalProps["registry_type"] = opts.RegistryType
	additionalProps["infra_id"] = opts.InfraID

	return getSegmentProjectTrack(
		opts.ProjectScopedTrackOpts,
		getDefaultSegmentTrack(additionalProps, RegistryProvisioningStart),
	)
}

// RegistryProvisioningErrorTrackOpts are the options for creating a track when a registry
// provisioning has failed
type RegistryProvisioningErrorTrackOpts struct {
	// note that this is a project-scoped track, since the registry has not been created yet
	*ProjectScopedTrackOpts

	RegistryType types.InfraKind
	InfraID      uint
}

// RegistryProvisioningErrorTrack returns a new track for when a registry
// provisioning has failed
func RegistryProvisioningErrorTrack(opts *RegistryProvisioningErrorTrackOpts) segmentTrack {
	additionalProps := make(map[string]interface{})
	additionalProps["registry_type"] = opts.RegistryType
	additionalProps["infra_id"] = opts.InfraID

	return getSegmentProjectTrack(
		opts.ProjectScopedTrackOpts,
		getDefaultSegmentTrack(additionalProps, RegistryProvisioningError),
	)
}

// RegistryProvisioningSuccessTrackOpts are the options for creating a track when a registry
// provisioning has completed
type RegistryProvisioningSuccessTrackOpts struct {
	*RegistryScopedTrackOpts

	RegistryType types.InfraKind
	InfraID      uint
}

// RegistryProvisioningSuccessTrack returns a new track for when a registry
// provisioning has completed
func RegistryProvisioningSuccessTrack(opts *RegistryProvisioningSuccessTrackOpts) segmentTrack {
	additionalProps := make(map[string]interface{})
	additionalProps["registry_type"] = opts.RegistryType
	additionalProps["infra_id"] = opts.InfraID

	return getSegmentRegistryTrack(
		opts.RegistryScopedTrackOpts,
		getDefaultSegmentTrack(additionalProps, RegistryProvisioningSuccess),
	)
}

// ClusterDestroyingStartTrackOpts are the options for creating a track when a cluster
// has started destroying
type ClusterDestroyingStartTrackOpts struct {
	*ClusterScopedTrackOpts

	ClusterType types.InfraKind
	InfraID     uint
}

// ClusterDestroyingStartTrack returns a track for when a cluster
// has started destroying
func ClusterDestroyingStartTrack(opts *ClusterDestroyingStartTrackOpts) segmentTrack {
	additionalProps := make(map[string]interface{})
	additionalProps["cluster_type"] = opts.ClusterType
	additionalProps["infra_id"] = opts.InfraID

	return getSegmentClusterTrack(
		opts.ClusterScopedTrackOpts,
		getDefaultSegmentTrack(additionalProps, ClusterDestroyingStart),
	)
}

// ClusterDestroyingSuccessTrackOpts are the options for creating a track when a cluster
// has successfully provisioned
type ClusterDestroyingSuccessTrackOpts struct {
	*ClusterScopedTrackOpts

	ClusterType types.InfraKind
	InfraID     uint
}

// ClusterDestroyingSuccessTrack returns a new track for when a cluster
// has successfully provisioned
func ClusterDestroyingSuccessTrack(opts *ClusterDestroyingSuccessTrackOpts) segmentTrack {
	additionalProps := make(map[string]interface{})
	additionalProps["cluster_type"] = opts.ClusterType
	additionalProps["infra_id"] = opts.InfraID

	return getSegmentClusterTrack(
		opts.ClusterScopedTrackOpts,
		getDefaultSegmentTrack(additionalProps, ClusterDestroyingSuccess),
	)
}

// StackLaunchStartOpts are the options for creating a track when a user starts creating a stack
type StackLaunchStartOpts struct {
	*ProjectScopedTrackOpts

	Email           string
	FirstName       string
	LastName        string
	CompanyName     string
	ValidateApplyV2 bool
}

// StackLaunchStartTrack returns a track for when a user starts creating a stack
func StackLaunchStartTrack(opts *StackLaunchStartOpts) segmentTrack {
	additionalProps := make(map[string]interface{})
	additionalProps["email"] = opts.Email
	additionalProps["name"] = opts.FirstName + " " + opts.LastName
	additionalProps["company"] = opts.CompanyName
	additionalProps["validate_apply_v2"] = opts.ValidateApplyV2

	return getSegmentProjectTrack(
		opts.ProjectScopedTrackOpts,
		getDefaultSegmentTrack(additionalProps, StackLaunchStart),
	)
}

// StackLaunchCompleteOpts are the options for creating a track when a user completes creating a stack
type StackLaunchCompleteOpts struct {
	*ProjectScopedTrackOpts

	StackName       string
	Email           string
	FirstName       string
	LastName        string
	CompanyName     string
	ValidateApplyV2 bool
}

// StackLaunchCompleteTrack returns a track for when a user completes creating a stack
func StackLaunchCompleteTrack(opts *StackLaunchCompleteOpts) segmentTrack {
	additionalProps := make(map[string]interface{})
	additionalProps["stack_name"] = opts.StackName
	additionalProps["email"] = opts.Email
	additionalProps["name"] = opts.FirstName + " " + opts.LastName
	additionalProps["company"] = opts.CompanyName
	additionalProps["validate_apply_v2"] = opts.ValidateApplyV2

	return getSegmentProjectTrack(
		opts.ProjectScopedTrackOpts,
		getDefaultSegmentTrack(additionalProps, StackLaunchComplete),
	)
}

// StackLaunchSuccessOpts are the options for creating a track when a user succeeds in creating a stack
type StackLaunchSuccessOpts struct {
	*ProjectScopedTrackOpts

	StackName       string
	Email           string
	FirstName       string
	LastName        string
	CompanyName     string
	ValidateApplyV2 bool
}

// StackLaunchCompleteTrack returns a track for when a user completes creating a stack
func StackLaunchSuccessTrack(opts *StackLaunchSuccessOpts) segmentTrack {
	additionalProps := make(map[string]interface{})
	additionalProps["stack_name"] = opts.StackName
	additionalProps["email"] = opts.Email
	additionalProps["name"] = opts.FirstName + " " + opts.LastName
	additionalProps["company"] = opts.CompanyName
	additionalProps["validate_apply_v2"] = opts.ValidateApplyV2

	return getSegmentProjectTrack(
		opts.ProjectScopedTrackOpts,
		getDefaultSegmentTrack(additionalProps, StackLaunchSuccess),
	)
}

// StackLaunchFailureOpts are the options for creating a track when a user fails in creating a stack
type StackLaunchFailureOpts struct {
	*ProjectScopedTrackOpts

	StackName       string
	Email           string
	FirstName       string
	LastName        string
	CompanyName     string
	ErrorMessage    string
	ValidateApplyV2 bool
}

// StackLaunchFailureTrack returns a track for when a user fails creating a stack
func StackLaunchFailureTrack(opts *StackLaunchFailureOpts) segmentTrack {
	additionalProps := make(map[string]interface{})
	additionalProps["stack_name"] = opts.StackName
	additionalProps["email"] = opts.Email
	additionalProps["name"] = opts.FirstName + " " + opts.LastName
	additionalProps["company"] = opts.CompanyName
	additionalProps["error_message"] = opts.ErrorMessage
	additionalProps["validate_apply_v2"] = opts.ValidateApplyV2

	return getSegmentProjectTrack(
		opts.ProjectScopedTrackOpts,
		getDefaultSegmentTrack(additionalProps, StackLaunchFailure),
	)
}

// StackDeletionOpts are the options for creating a track when a user deletes a stack
type StackDeletionOpts struct {
	*ProjectScopedTrackOpts

	StackName          string
	Email              string
	FirstName          string
	LastName           string
	CompanyName        string
	DeleteWorkflowFile bool
	ValidateApplyV2    bool
}

// StackDeletionTrack returns a track for when a user deletes a stack
func StackDeletionTrack(opts *StackDeletionOpts) segmentTrack {
	additionalProps := make(map[string]interface{})
	additionalProps["stack_name"] = opts.StackName
	additionalProps["email"] = opts.Email
	additionalProps["name"] = opts.FirstName + " " + opts.LastName
	additionalProps["company"] = opts.CompanyName
	additionalProps["delete_workflow_file"] = opts.DeleteWorkflowFile
	additionalProps["validate_apply_v2"] = opts.ValidateApplyV2

	return getSegmentProjectTrack(
		opts.ProjectScopedTrackOpts,
		getDefaultSegmentTrack(additionalProps, StackDeletion),
	)
}

// StackBuildOpts are the options for creating a track when a stack builds
type StackBuildOpts struct {
	*ProjectScopedTrackOpts

	StackName       string
	ErrorMessage    string
	B64BuildLogs    string
	Email           string
	FirstName       string
	LastName        string
	CompanyName     string
	ValidateApplyV2 bool
}

// StackBuildFailureTrack returns a track for when a stack fails to build
func StackBuildFailureTrack(opts *StackBuildOpts) segmentTrack {
	additionalProps := make(map[string]interface{})
	additionalProps["stack_name"] = opts.StackName
	additionalProps["error_message"] = opts.ErrorMessage
	additionalProps["email"] = opts.Email
	additionalProps["name"] = opts.FirstName + " " + opts.LastName
	additionalProps["company"] = opts.CompanyName
	additionalProps["validate_apply_v2"] = opts.ValidateApplyV2
	additionalProps["b64_build_logs"] = opts.B64BuildLogs

	return getSegmentProjectTrack(
		opts.ProjectScopedTrackOpts,
		getDefaultSegmentTrack(additionalProps, StackBuildFailure),
	)
}

// StackBuildSuccessTrack returns a track for when a stack succeeds to build
func StackBuildSuccessTrack(opts *StackBuildOpts) segmentTrack {
	additionalProps := make(map[string]interface{})
	additionalProps["stack_name"] = opts.StackName
	additionalProps["email"] = opts.Email
	additionalProps["name"] = opts.FirstName + " " + opts.LastName
	additionalProps["company"] = opts.CompanyName
	additionalProps["validate_apply_v2"] = opts.ValidateApplyV2

	return getSegmentProjectTrack(
		opts.ProjectScopedTrackOpts,
		getDefaultSegmentTrack(additionalProps, StackBuildSuccess),
	)
}

// StackBuildProgressingTrack returns a track for when a stack starts to build
func StackBuildProgressingTrack(opts *StackBuildOpts) segmentTrack {
	additionalProps := make(map[string]interface{})
	additionalProps["stack_name"] = opts.StackName
	additionalProps["email"] = opts.Email
	additionalProps["name"] = opts.FirstName + " " + opts.LastName
	additionalProps["company"] = opts.CompanyName
	additionalProps["validate_apply_v2"] = opts.ValidateApplyV2

	return getSegmentProjectTrack(
		opts.ProjectScopedTrackOpts,
		getDefaultSegmentTrack(additionalProps, StackBuildProgressing),
	)
}

// PorterAppUpdateOpts are the options for creating a track when a user updates a porter app
type PorterAppUpdateOpts struct {
	*ProjectScopedTrackOpts

	StackName       string
	Email           string
	FirstName       string
	LastName        string
	CompanyName     string
	ErrorMessage    string
	ErrorStackTrace string
	ValidateApplyV2 bool
}

// PorterAppUpdateFailureTrack returns a track for when a user attempts to update an app and receives an error
func PorterAppUpdateFailureTrack(opts *PorterAppUpdateOpts) segmentTrack {
	additionalProps := make(map[string]interface{})
	additionalProps["stack_name"] = opts.StackName
	additionalProps["email"] = opts.Email
	additionalProps["name"] = opts.FirstName + " " + opts.LastName
	additionalProps["company"] = opts.CompanyName
	additionalProps["error_message"] = opts.ErrorMessage
	additionalProps["error_stack_trace"] = opts.ErrorStackTrace
	additionalProps["validate_apply_v2"] = opts.ValidateApplyV2

	return getSegmentProjectTrack(
		opts.ProjectScopedTrackOpts,
		getDefaultSegmentTrack(additionalProps, PorterAppUpdateFailure),
	)
}

// CloudProviderPermissionsGrantedTrackOpts are the options for creating a track when a user grants permission to use porter
type CloudProviderPermissionsGrantedTrackOpts struct {
	*ProjectScopedTrackOpts

	Email                             string
	FirstName                         string
	LastName                          string
	CompanyName                       string
	CloudProvider                     string
	CloudProviderCredentialIdentifier string
}

// CloudProviderPermissionsGrantedTrack returns a track for when a user grants permission to use porter
func CloudProviderPermissionsGrantedTrack(opts *CloudProviderPermissionsGrantedTrackOpts) segmentTrack {
	additionalProps := make(map[string]interface{})
	additionalProps["email"] = opts.Email
	additionalProps["name"] = opts.FirstName + " " + opts.LastName
	additionalProps["company"] = opts.CompanyName
	additionalProps["cloud_provider"] = opts.CloudProvider
	additionalProps["cloud_provider_credential_identifier"] = opts.CloudProviderCredentialIdentifier

	return getSegmentProjectTrack(
		opts.ProjectScopedTrackOpts,
		getDefaultSegmentTrack(additionalProps, CloudProviderPermissionsGranted),
	)
}

// ClusterPreflightChecksFailedTrackOpts are the options for creating a track when a user fails preflight checks
type ClusterPreflightChecksFailedTrackOpts struct {
	*ProjectScopedTrackOpts

	Email         string
	FirstName     string
	LastName      string
	CompanyName   string
	ErrorMessage  string
	ClusterName   string
	CloudProvider string
}

// ClusterPreflightChecksFailedTrack returns a track for when a user fails preflight checks
func ClusterPreflightChecksFailedTrack(opts *ClusterPreflightChecksFailedTrackOpts) segmentTrack {
	additionalProps := make(map[string]interface{})
	additionalProps["email"] = opts.Email
	additionalProps["name"] = opts.FirstName + " " + opts.LastName
	additionalProps["company"] = opts.CompanyName
	additionalProps["error_message"] = opts.ErrorMessage
	additionalProps["cluster_name"] = opts.ClusterName
	additionalProps["cloud_provider"] = opts.CloudProvider

	return getSegmentProjectTrack(
		opts.ProjectScopedTrackOpts,
		getDefaultSegmentTrack(additionalProps, ClusterPreflightChecksFailed),
	)
}

// ClusterUpdateFailedTrackOpts are the options for creating a track when a user fails to update a cluster
type ClusterUpdateFailedTrackOpts struct {
	*ProjectScopedTrackOpts

	ClusterName   string
	Email         string
	FirstName     string
	LastName      string
	CompanyName   string
	ErrorMessage  string
	CloudProvider string
}

// ClusterUpdateFailedTrack returns a track for when a user fails to update a cluster
func ClusterUpdateFailedTrack(opts *ClusterUpdateFailedTrackOpts) segmentTrack {
	additionalProps := make(map[string]interface{})
	additionalProps["cluster_name"] = opts.ClusterName
	additionalProps["email"] = opts.Email
	additionalProps["name"] = opts.FirstName + " " + opts.LastName
	additionalProps["company"] = opts.CompanyName
	additionalProps["error_message"] = opts.ErrorMessage
	additionalProps["cloud_provider"] = opts.CloudProvider

	return getSegmentProjectTrack(
		opts.ProjectScopedTrackOpts,
		getDefaultSegmentTrack(additionalProps, ClusterUpdateFailed),
	)
}
