package nats

import (
	"context"
	"errors"
	"fmt"

	"github.com/nats-io/nats.go"
)

// NATS holds a connection to a NATS cluster
type NATS struct {
	NatsConnection *nats.Conn
	JetStream      nats.JetStreamContext
}

// Config contains the config required to setup a connection to a NATS cluster
type Config struct {
	URL string
}

// NewConnection creates a new nats and JetStream connection
func NewConnection(ctx context.Context, conf Config) (NATS, error) {
	var n NATS

	url := conf.URL
	if url == "" {
		url = nats.DefaultURL
	}
	nc, err := nats.Connect(conf.URL)
	if err != nil {
		return n, err
	}
	if nc == nil {
		return n, errors.New("nats connection was not obtained")
	}
	if len(nc.Servers()) == 0 {
		return n, errors.New("nats connection was not obtained, no servers added")
	}
	n.NatsConnection = nc

	js, err := nc.JetStream()
	if err != nil {
		return n, fmt.Errorf("jetstream connection was not obtained - %w", err)
	}
	ai, err := js.AccountInfo()
	if err != nil {
		return n, fmt.Errorf("jetstream connection was not obtained, no account info returned - %w", err)
	}
	if ai == nil {
		return n, fmt.Errorf("unable to get jetsteam")
	}
	n.JetStream = js

	return n, nil
}
