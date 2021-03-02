package provisioner

import (
	"context"

	redis "github.com/go-redis/redis/v8"
	"github.com/gorilla/websocket"
)

// ResourceStream performs an XREAD operation on the given stream and outputs it to the given websocket conn.
func ResourceStream(client *redis.Client, streamName string, conn *websocket.Conn) error {
	errorchan := make(chan error)

	go func() {
		// listens for websocket closing handshake
		for {
			_, _, err := conn.ReadMessage()

			if err != nil {
				defer conn.Close()
				errorchan <- err
				return
			}
		}
	}()

	go func() {
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

			if writeErr := conn.WriteJSON(messages); writeErr != nil {
				errorchan <- writeErr
				return
			}
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
