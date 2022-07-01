package types

const (
	URLParamKind URLParam = "kind"
)

type StreamStatusRequest struct {
	Selectors string `schema:"selectors"`
}

type GithubUnresolvedIncidents struct {
	Incidents []*struct {
		ID string `json:"id"`
	} `json:"incidents"`
}
