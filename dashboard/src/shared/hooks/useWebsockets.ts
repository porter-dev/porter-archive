import { useRef } from "react";

export interface NewWebsocketOptions {
  onopen?: () => void;
  onmessage?: (evt: MessageEvent) => void;
  onerror?: (err: ErrorEvent) => void;
  onclose?: (ev: CloseEvent) => void;
}

interface WebsocketConfig extends NewWebsocketOptions {
  url: string;
}

type WebsocketConfigMap = {
  [id: string]: WebsocketConfig;
};

type WebsocketMap = {
  [id: string]: WebSocket;
};

export const useWebsockets = () => {
  const websocketMap = useRef<WebsocketMap>({});
  const websocketConfigMap = useRef<WebsocketConfigMap>({});

  /**
   * Setup for a new websocket, after calling new websocket you can open the connection with openWebsocket
   * @param id Id to access later the websocket config/connection
   * @param apiEndpoint Endpoint to connect the websocket e.g: /api/websocket
   * @param options Websocket listeners
   * @returns An object with the config setted for that websocket. This config will be used to open the ws on openWebsocket
   */
  const newWebsocket = (
    id: string,
    apiEndpoint: string,
    options: NewWebsocketOptions
  ): WebsocketConfig => {
    if (!id) {
      // console.log("Id cannot be empty");
      return;
    }

    if (!apiEndpoint) {
      // console.log("Api endpoint string cannot be empty");
      return;
    }

    let protocol = window.location.protocol == "https:" ? "wss" : "ws";

    const url = `${protocol}://${window.location.host}${apiEndpoint}`;

    const mockFunction = () => {};

    const wsConfig: WebsocketConfig = {
      url,
      onopen: options?.onopen || mockFunction,
      onmessage: options?.onmessage || mockFunction,
      onerror: options?.onerror || mockFunction,
      onclose: options?.onclose || mockFunction,
    };

    websocketConfigMap.current = {
      ...websocketConfigMap.current,
      [id]: wsConfig,
    };
    return wsConfig;
  };

  /**
   * Opens the websocket connection based on a config previously setted by
   * newWebsocket
   */
  const openWebsocket = (id: string) => {
    const wsConfig = websocketConfigMap.current[id];

    // Prevent calling openWebsocket before newWebsocket
    if (!wsConfig) {
      // console.log("Couldn't find ws config");
      return;
    }
    // In case of having a previous websocket opened with the same ID, close the previous one
    const prevWs = getWebsocket(id);

    if (prevWs) {
      prevWs.close();
    }
    const { url, ...listeners } = wsConfig;

    const ws = new WebSocket(wsConfig.url);

    Object.assign(ws, listeners);

    websocketMap.current = {
      ...websocketMap.current,
      [id]: ws,
    };
  };

  /**
   * Close specific websocket
   */
  const closeWebsocket = (
    id: string,
    code: number = 4000,
    reason: string = "User closed the websocket connection"
  ) => {
    const ws = websocketMap.current[id];

    if (!ws) {
      // console.log(`Couldn't find websocket to close for id: ${id}`);
      return;
    }

    ws.close(code, reason);
    websocketMap.current[id] = null;
  };

  /**
   * Closes all websockets opened by the useWebsocket hook
   */
  const closeAllWebsockets = () => {
    Object.keys(websocketMap.current).forEach((key) => {
      closeWebsocket(key);
    });
  };

  /**
   * Get websocket by id
   */
  const getWebsocket = (id: string) => {
    return websocketMap.current[id];
  };

  return {
    newWebsocket,
    openWebsocket,
    getWebsocket,
    closeWebsocket,
    closeAllWebsockets,
  };
};
