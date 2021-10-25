import ProvisionerStatus, {
  TFModule,
  TFResource,
  TFResourceError,
} from "components/ProvisionerStatus";
import React, { useEffect, useState } from "react";
import api from "shared/api";
import { useWebsockets } from "shared/hooks/useWebsockets";

export const SharedStatus: React.FC<{
  setInfraStatus: (status: { hasError: boolean; description?: string }) => void;
  project_id: number;
  filter: string[];
}> = ({ setInfraStatus, project_id, filter }) => {
  const {
    newWebsocket,
    openWebsocket,
    closeWebsocket,
    closeAllWebsockets,
  } = useWebsockets();

  const [tfModules, setTFModules] = useState<TFModule[]>([]);

  const updateTFModules = (
    index: number,
    addedResources: TFResource[],
    erroredResources: TFResource[],
    globalErrors: TFResourceError[],
    gotDesired?: boolean
  ) => {
    if (!tfModules[index]?.resources) {
      tfModules[index].resources = [];
    }

    if (!tfModules[index]?.global_errors) {
      tfModules[index].global_errors = [];
    }

    if (gotDesired) {
      tfModules[index].got_desired = true;
    }

    let resources = tfModules[index].resources;

    // construct map of tf resources addresses to indices
    let resourceAddrMap = new Map<string, number>();

    tfModules[index].resources.forEach((resource, index) => {
      resourceAddrMap.set(resource.addr, index);
    });

    for (let addedResource of addedResources) {
      // if exists, update state to provisioned
      if (resourceAddrMap.has(addedResource.addr)) {
        let currResource = resources[resourceAddrMap.get(addedResource.addr)];
        addedResource.errored = currResource.errored;
        resources[resourceAddrMap.get(addedResource.addr)] = addedResource;
      } else {
        resources.push(addedResource);
        resourceAddrMap.set(addedResource.addr, resources.length - 1);

        // if the resource is being added but there's not a desired state, re-query for the
        // desired state
        if (!tfModules[index].got_desired) {
          updateDesiredState(index, tfModules[index]);
        }
      }
    }

    for (let erroredResource of erroredResources) {
      // if exists, update state to provisioned
      if (resourceAddrMap.has(erroredResource.addr)) {
        resources[resourceAddrMap.get(erroredResource.addr)] = erroredResource;
      } else {
        resources.push(erroredResource);
        resourceAddrMap.set(erroredResource.addr, resources.length - 1);
      }
    }

    tfModules[index].global_errors = [
      ...tfModules[index].global_errors,
      ...globalErrors,
    ];

    // remove duplicate global errors
    tfModules[index].global_errors = tfModules[index].global_errors.filter(
      (error, index, self) =>
        index === self.findIndex((e) => e.error_context === error.error_context)
    );

    setTFModules([...tfModules]);
  };

  useEffect(() => {
    // recompute tf module state each time, to see if infra is ready
    if (tfModules.length > 0) {
      // see if all tf modules are in a "created" state
      if (
        tfModules.filter((val) => val.status == "created").length ==
        tfModules.length
      ) {
        setInfraStatus({
          hasError: false,
        });
        return;
      }

      if (
        tfModules.filter((val) => val.status == "error").length ==
        tfModules.length
      ) {
        setInfraStatus({
          hasError: true,
        });
        return;
      }

      // otherwise, check that all resources in each module are provisioned. Each module
      // must have more than one resource
      let numModulesSuccessful = 0;
      let numModulesErrored = 0;

      for (let tfModule of tfModules) {
        if (tfModule.status == "created") {
          numModulesSuccessful++;
        } else if (tfModule.status == "error") {
          numModulesErrored++;
        } else {
          let resLength = tfModule.resources?.length;
          if (resLength > 0) {
            numModulesSuccessful +=
              tfModule.resources.filter((resource) => resource.provisioned)
                .length == resLength
                ? 1
                : 0;

            numModulesErrored +=
              tfModule.resources.filter(
                (resource) => resource.errored?.errored_out
              ).length > 0
                ? 1
                : 0;
          }
        }
      }

      if (numModulesSuccessful == tfModules.length) {
        setInfraStatus({
          hasError: false,
        });
      } else if (numModulesErrored + numModulesSuccessful == tfModules.length) {
        // otherwise, if all modules are either in an error state or successful,
        // set the status to error
        setInfraStatus({
          hasError: true,
        });
      }
    }
  }, [tfModules]);

  const setupInfraWebsocket = (
    websocketID: string,
    module: TFModule,
    index: number
  ) => {
    let apiPath = `/api/projects/${project_id}/infras/${module.id}/logs`;

    const wsConfig = {
      onopen: () => {
        console.log(`connected to websocket: ${websocketID}`);
      },
      onmessage: (evt: MessageEvent) => {
        // parse the data
        let parsedData = JSON.parse(evt.data);

        let addedResources: TFResource[] = [];
        let erroredResources: TFResource[] = [];
        let globalErrors: TFResourceError[] = [];

        for (let streamVal of parsedData) {
          let streamValData = JSON.parse(streamVal?.Values?.data);

          switch (streamValData?.type) {
            case "apply_complete":
              addedResources.push({
                addr: streamValData?.hook?.resource?.addr,
                provisioned: true,
                errored: {
                  errored_out: false,
                },
              });

              break;
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
                  });
                } else {
                  globalErrors.push({
                    errored_out: true,
                    error_context: streamValData["@message"],
                  });
                }
              }
            case "change_summary":
              if (streamValData.changes.add != 0) {
                updateDesiredState(index, module);
              }
            default:
          }
        }

        updateTFModules(index, addedResources, erroredResources, globalErrors);
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

  const mergeCurrentAndDesired = (
    index: number,
    desired: any,
    currentMap: Map<string, string>
  ) => {
    // map desired state to list of resources
    var addedResources: TFResource[] = desired?.map((val: any) => {
      return {
        addr: val?.addr,
        provisioned: currentMap.has(val?.addr),
        errored: {
          errored_out: val?.errored?.errored_out,
          error_context: val?.errored?.error_context,
        },
      };
    });

    updateTFModules(index, addedResources, [], [], true);
  };

  const updateDesiredState = (index: number, val: TFModule) => {
    api
      .getInfraDesired(
        "<token>",
        {},
        { project_id: project_id, infra_id: val?.id }
      )
      .then((resDesired) => {
        api
          .getInfraCurrent(
            "<token>",
            {},
            { project_id: project_id, infra_id: val?.id }
          )
          .then((resCurrent) => {
            var desired = resDesired.data;
            var current = resCurrent.data;

            // convert current state to a lookup table
            var currentMap: Map<string, string> = new Map();

            current?.resources?.forEach((val: any) => {
              currentMap.set(val?.type + "." + val?.name, "");
            });

            mergeCurrentAndDesired(index, desired, currentMap);
          })
          .catch((err) => {
            var desired = resDesired.data;
            var currentMap: Map<string, string> = new Map();

            // merge with empty current map
            mergeCurrentAndDesired(index, desired, currentMap);
          });
      })
      .catch((err) => console.log(err));
  };

  useEffect(() => {
    api.getInfra("<token>", {}, { project_id: project_id }).then((res) => {
      var matchedInfras: Map<string, any> = new Map();

      res.data.forEach((infra: any) => {
        // if filter list is empty, add infra automatically
        if (filter.length == 0) {
          matchedInfras.set(infra.kind + "-" + infra.id, infra);
        } else if (
          (filter.includes(infra.kind) && matchedInfras.get(infra.Kind)?.id) ||
          0 < infra.id
        ) {
          matchedInfras.set(infra.kind, infra);
        }
      });

      // query for desired and current state, and convert to tf module
      matchedInfras.forEach((infra: any) => {
        var module: TFModule = {
          id: infra.id,
          kind: infra.kind,
          status: infra.status,
          got_desired: false,
          created_at: infra.created_at,
        };

        tfModules.push(module);
      });

      setTFModules([...tfModules]);

      tfModules.forEach((val, index) => {
        if (val?.status != "created" && val?.status != "destroyed") {
          updateDesiredState(index, val);
          setupInfraWebsocket(val.id + "", val, index);
        }
      });
    });

    return closeAllWebsockets;
  }, []);

  let sortedModules = tfModules.sort((a, b) =>
    b.id < a.id ? -1 : b.id > a.id ? 1 : 0
  );

  return (
    <>
      <ProvisionerStatus modules={sortedModules} />
    </>
  );
};
