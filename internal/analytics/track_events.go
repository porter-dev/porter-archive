package analytics

type SegmentEvent string

const (
	NewUser            SegmentEvent = "New User"
	RedeployViaWebhook SegmentEvent = "Triggered Re-deploy via Webhook"
)
