import ProvisionerStatus, {
  TFModule,
  TFResource,
  TFResourceError,
} from "components/ProvisionerStatus";
import React, { useEffect, useMemo, useRef, useState } from "react";
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
  const [isLoadingState, setIsLoadingState] = useState(true);

  const updateTFModules = (
    index: number, // TF module index
    addedResources: TFResource[], //
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

    setTFModules([...tfModules]);
  };

  useEffect(() => {
    if (isLoadingState) {
      return;
    }
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
          description: "Encountered error while provisioning",
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

            // if there's a global error, or the number of resources that errored_out is
            // greater than 0, this resource is in an error state
            numModulesErrored +=
              tfModule.global_errors?.length > 0 ||
              tfModule.resources.filter(
                (resource) => resource.errored?.errored_out
              ).length > 0
                ? 1
                : 0;
          } else if (tfModule.global_errors?.length > 0) {
            numModulesErrored += 1;
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
    } else {
      setInfraStatus(null);
    }
  }, [tfModules, isLoadingState]);

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
    setIsLoadingState(true);
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
            debugger;
            current?.resources?.forEach((val: any) => {
              currentMap.set(val?.type + "." + val?.name, "");
            });
            console.log(current);
            mergeCurrentAndDesired(index, desired, currentMap);
          })
          .catch((err) => {
            var desired = resDesired.data;
            var currentMap: Map<string, string> = new Map();

            // merge with empty current map
            mergeCurrentAndDesired(index, desired, currentMap);
          })
          .finally(() => {
            setIsLoadingState(true);
          });
      })
      .catch((err) => {
        console.log(err);
        setIsLoadingState(true);
      });
  };

  useEffect(() => {
    api.getInfra("<token>", {}, { project_id: project_id }).then((res) => {
      var matchedInfras: Map<string, any> = new Map();

      res.data.forEach((infra: any) => {
        // if filter list is empty, add infra automatically
        if (filter.length == 0) {
          matchedInfras.set(infra.kind + "-" + infra.id, infra);
        } else if (
          filter.includes(infra.kind) &&
          (matchedInfras.get(infra.Kind)?.id || 0 < infra.id)
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

      if (tfModules.every((m) => m.status === "created")) {
        setInfraStatus({
          hasError: false,
        });
      }

      setTFModules([...tfModules]);

      tfModules.forEach((val, index) => {
        if (val?.status != "created") {
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

type Props = {
  setInfraStatus: (status: { hasError: boolean; description?: string }) => void;
  project_id: number;
  filter: string[];
};

const infra = [
  {
    id: 2758,
    created_at: "2021-11-09T19:24:00.485269Z",
    updated_at: "2021-11-09T19:24:17.820528Z",
    project_id: 2380,
    kind: "docr",
    status: "created",
    do_integration_id: 1717,
    last_applied: { docr_name: "aide", docr_subscription_tier: "basic" },
  },
  {
    id: 2759,
    created_at: "2021-11-09T19:24:00.66398Z",
    updated_at: "2021-11-09T19:33:39.913885Z",
    project_id: 2380,
    kind: "doks",
    status: "created",
    do_integration_id: 1717,
    last_applied: { cluster_name: "aide-cluster", do_region: "nyc1" },
  },
];

type Infra = {
  id: number;
  created_at: string;
  updated_at: string;
  project_id: number;
  kind: string;
  status: string;
  last_applied: any;
};

interface TMPTFModule {
  id: number;
  kind: string;
  status: string;
  created_at: string;
  global_errors?: TFResourceError[];
  got_desired: boolean;
  // optional resources, if not created
  resources?: TFResource[];
  desired?: TFResource[];
}

const desiredExample = {
  addr: "google_compute_address.lb",
  errored: { errored_out: false },
  implied_provider: "google",
  resource: "google_compute_address.lb",
  resource_name: "lb",
  resource_type: "google_compute_address",
};

type Desired = {
  addr: string;
  errored:
    | { errored_out: false }
    | { errored_out: true; error_context: string };
  implied_provider: string;
  resource: string;
  resource_name: string;
  resource_type: string;
};

export const StatusPage = ({
  filter: infraFilters,
  project_id,
  setInfraStatus,
}: Props) => {
  const {
    newWebsocket,
    openWebsocket,
    closeWebsocket,
    closeAllWebsockets,
  } = useWebsockets();
  const [isLoading, setIsLoading] = useState(true);
  const [_tfModules, setTFModules] = useState<TFModule[]>([]);
  const {
    tfModules,
    initModule,
    updateDesired,
    updateModuleResources,
  } = useTFModules();

  const infraExistsOnFilter = (currentInfra: Infra) => {
    if (!Array.isArray(infraFilters) || !infraFilters?.length) {
      return true;
    }

    if (infraFilters.includes(currentInfra.kind)) {
      return true;
    }
    return false;
  };

  const getInfras = async () => {
    try {
      const res = await api.getInfra<Infra[]>(
        "<token>",
        {},
        { project_id: project_id }
      );
      const matchedInfras = res.data.filter(infraExistsOnFilter);

      // Check if all infras are created then enable continue button
      if (matchedInfras.every((infra) => infra.status === "created")) {
        setInfraStatus({
          hasError: false,
        });
      }

      // Init tf modules based on matched infras
      matchedInfras.forEach((infra) => {
        initModule(infra);
        getDesiredState(infra.id);
      });
    } catch (error) {}
  };

  const getDesiredState = async (infra_id: number) => {
    try {
      const desired = await api
        .getInfraDesired("<token>", {}, { project_id, infra_id })
        .then((res) => res?.data);

      updateDesired(infra_id, desired);
      getProvisionedModules(infra_id);
    } catch (error) {
      console.error(error);
      setTimeout(() => {
        getDesiredState(infra_id);
      }, 500);
    }
  };

  const getProvisionedModules = async (infra_id: number) => {
    try {
      const current = await api
        .getInfraCurrent("<token>", {}, { project_id, infra_id })
        .then((res) => res?.data);
      console.log(current);
      const provisionedResources = current?.resources?.map((resource: any) => {
        return {
          addr: `${resource?.type}.${resource?.name}`,
        };
      });
      console.log(provisionedResources);
      updateModuleResources(infra_id, provisionedResources);
    } catch (error) {}
  };

  useEffect(() => {
    getInfras();
  }, []);

  const sortedModules = tfModules.sort((a, b) =>
    b.id < a.id ? -1 : b.id > a.id ? 1 : 0
  );

  return <ProvisionerStatus modules={sortedModules} />;
};

type TFModulesState = {
  [key: number]: TFModule;
};

const useTFModules = () => {
  const modules = useRef<TFModulesState>({});
  const [tfModules, setTfModules] = useState<TFModule[]>([]);

  const updateTFModules = (): void => {
    if (typeof modules.current !== "object") {
      setTfModules([]);
    }

    const sortedModules = Object.values(modules.current).sort((a, b) =>
      b.id < a.id ? -1 : b.id > a.id ? 1 : 0
    );
    setTfModules(sortedModules);
  };

  const initModule = (infra: Infra) => {
    const module: TFModule = {
      id: infra.id,
      kind: infra.kind,
      status: infra.status,
      got_desired: false,
      created_at: infra.created_at,
    };
    modules.current[infra.id] = module;
  };

  const setModule = (infraId: number, module: TFModule) => {
    modules.current = {
      ...modules.current,
      [infraId]: module,
    };
    updateTFModules();
  };

  const getModule = (infraId: number) => {
    return { ...modules.current[infraId] };
  };

  const updateDesired = (infraId: number, desired: Desired[]) => {
    const selectedModule = getModule(infraId);

    if (!Array.isArray(selectedModule?.resources)) {
      selectedModule.resources = [];
    }

    selectedModule.resources = desired.map((d) => {
      return {
        addr: d.addr,
        errored: d.errored,
        provisioned: false,
      };
    });

    setModule(infraId, selectedModule);
  };

  const updateModuleResources = (
    infraId: number,
    provisionedResources: { addr: string }[]
  ) => {
    const selectedModule = getModule(infraId);
    debugger;
    const updatedResources = selectedModule.resources.map((resource) => {
      const resourceWasProvisioned = !!provisionedResources.find(
        (pr) => pr.addr === resource.addr
      );

      return {
        ...resource,
        provisioned: resourceWasProvisioned,
      };
    });

    selectedModule.resources = updatedResources;

    setModule(infraId, selectedModule);
  };

  return {
    tfModules,
    initModule,
    updateDesired,
    updateModuleResources,
  };
};
