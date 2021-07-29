package slack

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/porter-dev/porter/internal/models/integrations"
	"golang.org/x/oauth2"
)

func TokenToSlackIntegration(token *oauth2.Token) (*integrations.SlackIntegration, error) {
	// cast the "incoming_webhook" field to a map[string]string
	webhookConfig, ok := token.Extra("incoming_webhook").(map[string]interface{})

	if !ok {
		return nil, fmt.Errorf("could not get incoming webhook field from token")
	}

	teamInfo, err := getTeamInfo(token)

	if err != nil {
		return nil, err
	}

	return &integrations.SlackIntegration{
		SharedOAuthModel: integrations.SharedOAuthModel{
			AccessToken: []byte(token.AccessToken),
		},
		TeamID:           teamInfo.Team.ID,
		TeamIconURL:      teamInfo.Team.Icon.Image132,
		Channel:          webhookConfig["channel"].(string),
		ChannelID:        webhookConfig["channel_id"].(string),
		ConfigurationURL: webhookConfig["configuration_url"].(string),
		Webhook:          []byte(webhookConfig["url"].(string)),
	}, nil
}

type teamInfoResponse struct {
	OK   bool `json:"ok"`
	Team struct {
		ID   string `json:"id"`
		Name string `json:"name"`
		Icon struct {
			Image132 string `json:"image_132"`
		}
	} `json:"team"`
}

func getTeamInfo(token *oauth2.Token) (*teamInfoResponse, error) {
	url := "https://slack.com/api/team.info"

	// Create a new request using http
	req, err := http.NewRequest("GET", url, nil)

	// add authorization header to the request
	req.Header.Add("Authorization", fmt.Sprintf("Bearer %s", token.AccessToken))

	// Send req using http Client
	client := &http.Client{}
	resp, err := client.Do(req)

	if err != nil {
		return nil, err
	}

	defer resp.Body.Close()

	teamInfo := teamInfoResponse{}

	err = json.NewDecoder(resp.Body).Decode(&teamInfo)

	if err != nil {
		return nil, err
	}

	return &teamInfo, nil
}
