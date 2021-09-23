package websocket

import (
	"net/http"

	"github.com/gorilla/websocket"
)

type Upgrader struct {
	WSUpgrader *websocket.Upgrader
}

func (u *Upgrader) Upgrade(
	w http.ResponseWriter,
	r *http.Request,
	responseHeader http.Header,
) (*websocket.Conn, http.ResponseWriter, *WebsocketSafeReadWriter, error) {
	conn, err := u.WSUpgrader.Upgrade(w, r, responseHeader)

	safeWriter := &WebsocketSafeReadWriter{conn}
	rw := &WebsocketResponseWriter{conn, safeWriter}

	return conn, rw, safeWriter, err
}
