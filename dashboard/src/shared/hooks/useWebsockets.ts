import { useCallback, useEffect, useRef, useState } from "react"

interface NewWebsocketOptions {
  onopen?: () => void;
  onmessage?: (evt: MessageEvent) => void;
  onerror?: (err: ErrorEvent) => void;
  onclose?: (ev: CloseEvent) => void;
}

interface WebsocketConfig extends NewWebsocketOptions {
  url: string;
}

type WebsocketConfigMap = {
  [id: string]: WebsocketConfig
}

type WebsocketMap = {
  [id: string]: WebSocket
}

export const useWebsockets = () => {
  const websocketMap = useRef<WebsocketMap>({});
  const websocketConfigMap = useRef<WebsocketConfigMap>({})
  
  const newWebsocket = (id: string, apiEndpoint: string, options: NewWebsocketOptions): WebsocketConfig => {
    
    if (!id) {
      console.log("Id cannot be empty");
      return;
    }

    if (!apiEndpoint) {
      console.log("Api endpoint string cannot be empty")
      return;
    }


    let protocol = window.location.protocol == "https:" ? "wss" : "ws";

    const url = `${protocol}://${window.location.host}${apiEndpoint}`

    const mockFunction = () => {}
    
    const wsConfig: WebsocketConfig = {
      url,
      onopen: options?.onopen || mockFunction,
      onmessage: options?.onmessage || mockFunction,
      onerror: options?.onerror || mockFunction,
      onclose: options?.onclose || mockFunction,
    }
    
    websocketConfigMap.current = {
      ...websocketConfigMap.current,
      [id]: wsConfig,
    }
    return wsConfig;
  }

  const openWebsocket = (id: string) => {
    const wsConfig = websocketConfigMap.current[id];

    if (!wsConfig) {
      console.log("Couldn't find ws config")
      return;
    }
    const ws = new WebSocket(wsConfig.url);
    ws.onopen = wsConfig.onopen;
    ws.onmessage = wsConfig.onmessage;
    ws.onerror = wsConfig.onerror;
    ws.onclose = wsConfig.onclose;
    
    websocketMap.current = {
      ...websocketMap.current,
      [id]: ws,
    }
  }

  const closeWebsocket = (id: string, code?: number, reason?: string) => {
    const ws = websocketMap.current[id];

    if (!ws) {
      console.log(`Couldn't find websocket to close for id: ${id}`);
      return;
    }

    ws.close(code, reason);
  }

  const closeAllWebsockets = () => {
    Object.keys(websocketMap.current).forEach(key => {
      closeWebsocket(key);
    })
  }

  const getWebsocket = (id: string) => {
    return websocketMap.current[id];
  }

  return {
    newWebsocket,
    openWebsocket,
    getWebsocket,
    closeWebsocket,
    closeAllWebsockets
  }
}
