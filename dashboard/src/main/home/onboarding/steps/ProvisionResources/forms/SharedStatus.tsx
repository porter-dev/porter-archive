import ProvisionerStatus, { TFModule, TFResource, TFResourceError } from "components/ProvisionerStatus";
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

    const updateTFModules = (
      index : number,
      addedResources : TFResource[],
      erroredResources : TFResource[],
      globalErrors : TFResourceError[],
    ) => {
      if (!tfModules[index]?.resources) {
        tfModules[index].resources = []
      }

      if (!tfModules[index]?.global_errors) {
        tfModules[index].global_errors = []
      }

      let resources = tfModules[index].resources

      // construct map of tf resources addresses to indices
      let resourceAddrMap = new Map<string, number>()

      tfModules[index].resources.forEach((resource, index) => {
        resourceAddrMap.set(resource.addr, index)
      });

      for (let addedResource of addedResources) {
        // if exists, update state to provisioned
        if (resourceAddrMap.has(addedResource.addr)) {
          resources[resourceAddrMap.get(addedResource.addr)] = addedResource
        } else {
          resources.push(addedResource)
          resourceAddrMap.set(addedResource.addr, resources.length - 1)
        }
      }

      for (let erroredResource of erroredResources) {
        // if exists, update state to provisioned
        if (resourceAddrMap.has(erroredResource.addr)) {
          resources[resourceAddrMap.get(erroredResource.addr)] = erroredResource
        } else {
          resources.push(erroredResource)
          resourceAddrMap.set(erroredResource.addr, resources.length - 1)
        }
      }

      tfModules[index].global_errors = [...tfModules[index].global_errors, ...globalErrors]

      // remove duplicate global errors
      tfModules[index].global_errors = tfModules[index].global_errors.filter((error, index, self) =>
        index === self.findIndex((e) => (
          e.error_context === error.error_context
        ))
      )

      setTFModules([...tfModules])
    }
  
    const setupInfraWebsocket = (
      websocketID: string,
      module: TFModule,
      index: number,
    ) => {
      let apiPath = `/api/projects/${project_id}/infras/${module.id}/logs`;
  
      const wsConfig = {
        onopen: () => {
          console.log(`connected to websocket: ${websocketID}`);
        },
        onmessage: (evt: MessageEvent) => {
          // parse the data
          let parsedData = JSON.parse(evt.data)

          let addedResources : TFResource[] = []
          let erroredResources : TFResource[] = []
          let globalErrors : TFResourceError[] = []

          for (let streamVal of parsedData) {
            let streamValData = JSON.parse(streamVal?.Values?.data)

            switch (streamValData?.type) {
              case "apply_complete":
                addedResources.push({
                  addr: streamValData?.hook?.resource?.addr,
                  provisioned: true,
                  errored: {
                    errored_out: false,
                  },
                })

                break
              case "diagnostic":
                if (streamValData["@level"] == "error") {
                  if (streamValData?.hook?.resource?.addr != "") {
                    erroredResources.push({
                      addr: streamValData?.hook?.resource?.addr,
                      provisioned: false,
                      errored: {
                        errored_out: true,
                        error_context: streamValData["@message"],
                      },
                    })
                  } else {
                    globalErrors.push({
                      errored_out: true,
                      error_context: streamValData["@message"],
                    })
                  }
                }
              default:
            }
          }

          updateTFModules(index, addedResources, erroredResources, globalErrors)
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
        var numCreated = 0
  
        res.data.forEach((infra : any) => {
          // if filter list is empty, add infra automatically
          if (filter.length == 0) {
            matchedInfras.set(infra.kind + "-" + infra.id, infra)
          } else if (filter.includes(infra.kind) && matchedInfras.get(infra.Kind)?.id || 0 < infra.id) {
            matchedInfras.set(infra.kind, infra)
          }

          numCreated += infra?.status == "created" ? 1 : 0
        })
          
        // if all created, call next form step
        if (numCreated == res.data.length) {
          nextFormStep()
        }

        // query for desired and current state, and convert to tf module
        matchedInfras.forEach((infra : any) => {
          var module : TFModule = {
            id: infra.id,
            kind: infra.kind,
            status: infra.status,
          }

          if (infra?.status != "created" && infra?.status != "destroyed") {
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

                module.resources = resources
              }).catch((err) => console.log(err))
            }).catch((err) => console.log(err))
          }

          tfModules.push(module)
        });
  
        setTFModules([...tfModules])

        tfModules.forEach((val, index) => {
          setupInfraWebsocket(val.id + "", val, index);
        }) 
      })

      return closeAllWebsockets
    }, [])
  
    return (
      <>
        <ProvisionerStatus 
          modules={tfModules}
        />
      </>
    );
  };