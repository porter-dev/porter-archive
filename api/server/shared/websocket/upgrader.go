package websocket

import (
	"fmt"
	"net/http"

	"github.com/gorilla/websocket"
)

type Upgrader struct {
	WSUpgrader *websocket.Upgrader
}

var UpgraderCheckOriginErr = fmt.Errorf("request origin not allowed by Upgrader.CheckOrigin")

func (u *Upgrader) Upgrade(
	w http.ResponseWriter,
	r *http.Request,
	responseHeader http.Header,
) (*websocket.Conn, http.ResponseWriter, *WebsocketSafeReadWriter, error) {
	// we manually call CheckOrigin and pass a specific error to the client in this case
	check := u.WSUpgrader.CheckOrigin(r)

	if !check {
		return nil, nil, nil, UpgraderCheckOriginErr
	}

	conn, err := u.WSUpgrader.Upgrade(w, r, responseHeader)

	safeWriter := &WebsocketSafeReadWriter{conn}
	rw := &WebsocketResponseWriter{conn, safeWriter}

	return conn, rw, safeWriter, err
}
