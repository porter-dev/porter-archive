import { useCallback, useEffect, useState } from "react"

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
  const [websocketMap, setWebsocketMap] = useState<WebsocketMap>({});
  const [websocketConfigMap, setWebsocketConfigMap] = useState<WebsocketConfigMap>({});

  
  const newWebsocket = (id: string, apiEndpoint: string, options: NewWebsocketOptions): WebsocketConfig => {
    
    let protocol = window.location.protocol == "https:" ? "wss" : "ws";

    const url = `${protocol}://${window.location.host}${apiEndpoint}`

    const mockFunction = (method: string) => () => {
      console.log(`${method} not implemented`);
    }
    
    const wsConfig: WebsocketConfig = {
      url,
      onopen: options.onopen || mockFunction("onopen"),
      onmessage: options.onmessage || mockFunction("onmessage"),
      onerror: options.onerror || mockFunction("onerror"),
      onclose: options.onclose || mockFunction("onclose"),
    }
    
    setWebsocketConfigMap((oldWebsocketConfigMap) => {
      console.log(`Save config for ${id}`)
      return ({
      ...oldWebsocketConfigMap,
      [id]: wsConfig,
    })});

    return wsConfig;
  }

  const openWebsocket = 
    (id: string) => {
      const wsConfig = websocketConfigMap[id];
      // debugger;
      if (!wsConfig) {
        console.log("Couldn't find ws config")
        return;
      }
      const ws = new WebSocket(wsConfig.url);
      ws.onopen = wsConfig.onopen;
      ws.onmessage = wsConfig.onmessage;
      ws.onerror = wsConfig.onerror;
      ws.onclose = wsConfig.onclose;
  
      setWebsocketMap((oldWebsocketMap) => ({
        ...oldWebsocketMap,
        [id]: ws,
      }))
    }

  const closeWebsocket = (id: string, code?: number, reason?: string) => {
    const ws = websocketMap[id];

    ws.close(code, reason);
  }

  const closeAllWebsockets = () => {
    Object.keys(websocketMap).forEach(key => {
      closeWebsocket(key);
    })
  }

  const getWebsocket = (id: string) => {
    return websocketMap[id];
  }

  useEffect(() => {
    console.log(websocketConfigMap);
  }, [websocketConfigMap])

  return {
    newWebsocket,
    openWebsocket,
    getWebsocket,
    closeWebsocket,
    closeAllWebsockets
  }
}
