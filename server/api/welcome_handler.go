package api

import (
	"net/http"
	"net/url"
)

// HandleGetCapabilities gets the capabilities of the server
func (app *App) HandleWelcome(w http.ResponseWriter, r *http.Request) {
	vals, err := url.ParseQuery(r.URL.RawQuery)

	if err != nil {
		return
	}

	req, err := http.NewRequest("GET", app.ServerConf.WelcomeFormWebhook, nil)

	if err != nil {
		return
	}

	q := req.URL.Query()
	q.Add("email", vals["email"][0])
	q.Add("isCompany", vals["isCompany"][0])
	q.Add("company", vals["company"][0])
	q.Add("role", vals["role"][0])
	req.URL.RawQuery = q.Encode()

	_, err = http.Get(req.URL.String())

	if err != nil {
		return
	}
}
