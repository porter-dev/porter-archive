package websocket

import (
	"errors"
	"net/http"
	"syscall"

	"github.com/gorilla/websocket"
)

type WebsocketSafeReadWriter struct {
	conn *websocket.Conn
}

func (w *WebsocketSafeReadWriter) WriteJSONWithChannel(v interface{}, errorChan chan<- error) {
	err := w.conn.WriteJSON(v)

	if err != nil {
		if errOr(err, websocket.ErrCloseSent, syscall.EPIPE, syscall.ECONNRESET) {
			// if close has been sent, or error is broken pipe error or connection reset, we want to
			// send a message to the error channel to ensure closure but we ignore the error
			errorChan <- nil
		} else if err != nil {
			errorChan <- err
		}
	}
}

func (w *WebsocketSafeReadWriter) Write(data []byte) (int, error) {
	err := w.conn.WriteMessage(websocket.TextMessage, data)

	if err != nil {
		if errOr(err, websocket.ErrCloseSent, syscall.EPIPE, syscall.ECONNRESET) {
			// if close has been sent, or error is broken pipe error or connection reset, we want to
			// send a message to the error channel to ensure closure but we ignore the error
			return 0, nil
		} else if err != nil {
			return 0, err
		}
	}

	return len(data), nil
}

func (w *WebsocketSafeReadWriter) ReadMessage() (messageType int, p []byte, err error) {
	return w.conn.ReadMessage()
}

type WebsocketResponseWriter struct {
	conn       *websocket.Conn
	safeWriter *WebsocketSafeReadWriter
}

// no HTTP headers in websocket protocol
func (w *WebsocketResponseWriter) Header() http.Header {
	return nil
}

// Write attempts to write a message to the websocket connection
func (w *WebsocketResponseWriter) Write(data []byte) (int, error) {
	return w.safeWriter.Write(data)
}

// no-op; no HTTP headers in websocket protocol
func (w *WebsocketResponseWriter) WriteHeader(statusCode int) {
	return
}

// helper that returns true when `err` matches any of the candidates
func errOr(err error, candidates ...error) bool {
	res := false

	for _, cErr := range candidates {
		res = res || errors.Is(err, cErr)
	}

	return res
}
