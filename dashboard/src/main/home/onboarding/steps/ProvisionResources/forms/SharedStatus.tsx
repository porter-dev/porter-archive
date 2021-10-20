import ProvisionerStatus, { TFModule, TFResource } from "components/ProvisionerStatus";
import React, { useEffect, useState } from "react";
import api from "shared/api";
import { useWebsockets } from "shared/hooks/useWebsockets";

export const SharedStatus: React.FC<{
    nextFormStep: () => void;
    project_id: number;
    filter: string[];
  }> = ({ nextFormStep, project_id, filter }) => {
    const {
      newWebsocket,
      openWebsocket,
      closeWebsocket,
      closeAllWebsockets,
    } = useWebsockets();
  
    const [tfModules, setTFModules] = useState<TFModule[]>([]);
  
    const setupInfraWebsocket = (
      websocketID: string,
      module: TFModule
    ) => {
      let apiPath = `/api/projects/${project_id}/infras/${module.id}/logs`;
  
      const wsConfig = {
        onopen: () => {
          console.log(`connected to websocket: ${websocketID}`);
        },
        onmessage: (evt: MessageEvent) => {
          console.log("EVENT IS", evt)
        },
  
        onclose: () => {
          console.log(`closing websocket: ${websocketID}`);
        },
  
        onerror: (err: ErrorEvent) => {
          console.log(err);
          closeWebsocket(websocketID);
        },
      };
  
      newWebsocket(websocketID, apiPath, wsConfig);
      openWebsocket(websocketID);
    };
  
    useEffect(() => {  
      api.getInfra("<token>", {}, { project_id: project_id }).then((res) => {
        var matchedInfras : Map<string, any> = new Map()
  
        res.data.forEach((infra : any) => {
          if (filter.includes(infra.kind) && matchedInfras.get(infra.Kind)?.id || 0 < infra.id) {
            matchedInfras.set(infra.kind, infra)
          }
        })
  
        var modules : TFModule[] = []
  
        // query for desired and current state, and convert to tf module
        matchedInfras.forEach((infra : any) => {
          api.getInfraDesired("<token>", {}, { project_id: project_id, infra_id: infra?.id }).then((resDesired) => {
            api.getInfraCurrent("<token>", {}, { project_id: project_id, infra_id: infra?.id }).then((resCurrent) => {
              var desired = resDesired.data
              var current = resCurrent.data
  
              // convert current state to a lookup table
              var currentMap : Map<string, string> = new Map()
  
              current?.resources?.forEach((val : any) => {
                currentMap.set(val?.type + "." + val?.name, "")
              })
  
              // map desired state to list of resources
              var resources : TFResource[] = desired?.map((val : any) => {
                return {
                  addr: val?.addr,
                  provisioned: currentMap.has(val?.addr),
                  errored: {
                    errored_out: val?.errored?.errored_out,
                    error_context: val?.errored?.error_context,
                  },
                }
              })
  
              var module : TFModule = {
                id: infra.id,
                kind: infra.kind,
                resources: resources,
              }
  
              modules.push(module)
            })
          })
        });
  
        setTFModules(modules)
      })
    }, [])
  
    useEffect(() => {
      tfModules.forEach((val) => {
        setupInfraWebsocket(val.id + "", val);
      })
  
      return () => {
        tfModules.forEach((val) => {
          closeWebsocket(val.id + "");        
        })
      };
    }, [tfModules]);
  
    return (
      <>
        <ProvisionerStatus 
          modules={tfModules}
        />
      </>
    );
  };