package redis_stream

import (
	"context"

	redis "github.com/go-redis/redis/v8"
	"github.com/porter-dev/porter/api/server/shared/websocket"
)

// ResourceStream performs an XREAD operation on the given stream and outputs it to the given websocket conn.
func ResourceStream(client *redis.Client, streamName string, rw *websocket.WebsocketSafeReadWriter) error {
	errorchan := make(chan error)

	go func() {
		defer func() {
			if r := recover(); r != nil {
				// TODO: add method to alert on panic
				return
			}
		}()

		// listens for websocket closing handshake
		for {
			if _, _, err := rw.ReadMessage(); err != nil {
				errorchan <- nil
				return
			}
		}
	}()

	go func() {
		defer func() {
			if r := recover(); r != nil {
				// TODO: add method to alert on panic
				return
			}
		}()

		lastID := "0-0"

		for {
			xstream, err := client.XRead(
				context.Background(),
				&redis.XReadArgs{
					Streams: []string{streamName, lastID},
					Block:   0,
				},
			).Result()

			if err != nil {
				return
			}

			messages := xstream[0].Messages
			lastID = messages[len(messages)-1].ID

			rw.WriteJSON(messages)
		}
	}()

	for {
		select {
		case err := <-errorchan:
			close(errorchan)
			client.Close()
			return err
		}
	}
}
