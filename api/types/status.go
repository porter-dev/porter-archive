package types

const (
	URLParamKind URLParam = "kind"
)

type StreamStatusRequest struct {
	Selectors string `schema:"selectors"`
}
