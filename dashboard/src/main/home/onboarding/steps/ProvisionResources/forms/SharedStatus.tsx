import ProvisionerStatus, {
  TFModule,
  TFResource,
  TFResourceError,
} from "components/ProvisionerStatus";
import { unionBy } from "lodash";
import React, { useEffect, useMemo, useRef, useState } from "react";
import api from "shared/api";
import { NewWebsocketOptions, useWebsockets } from "shared/hooks/useWebsockets";

type Props = {
  setInfraStatus: (status: { hasError: boolean; description?: string }) => void;
  project_id: number;
  filter: string[];
};

type Infra = {
  id: number;
  created_at: string;
  updated_at: string;
  project_id: number;
  kind: string;
  status: string;
  last_applied: any;
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

type InfraCurrentResponse = {
  version: number;
  terraform_version: string;
  serial: number;
  lineage: string;
  outputs: any;
  resources: {
    instances: any[];
    mode: string;
    name: string;
    provider: string;
    type: string;
  }[];
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

  const {
    tfModules,
    initModule,
    updateDesired,
    updateModuleResources,
    updateGlobalErrorsForModule,
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
      await getProvisionedModules(infra_id);
      connectToLiveUpdateModule(infra_id);
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
        .getInfraCurrent<InfraCurrentResponse>(
          "<token>",
          {},
          { project_id, infra_id }
        )
        .then((res) => res?.data);

      const provisionedResources: TFResource[] = current?.resources?.map(
        (resource: any) => {
          return {
            addr: `${resource?.type}.${resource?.name}`,
            provisioned: true,
            errored: {
              errored_out: false,
            },
          } as TFResource;
        }
      );

      updateModuleResources(infra_id, provisionedResources);
    } catch (error) {
      console.error(error);
    }
  };

  const connectToLiveUpdateModule = (infra_id: number) => {
    const websocketId = `${infra_id}`;
    const apiPath = `/api/projects/${project_id}/infras/${infra_id}/logs`;

    const wsConfig: NewWebsocketOptions = {
      onopen: () => {
        console.log(`connected to websocket for infra_id: ${websocketId}`);
      },
      onmessage: (evt: MessageEvent) => {
        // parse the data
        const parsedData = JSON.parse(evt.data);

        const addedResources: TFResource[] = [];
        const erroredResources: TFResource[] = [];
        const globalErrors: TFResourceError[] = [];

        for (const streamVal of parsedData) {
          const streamValData = JSON.parse(streamVal?.Values?.data);

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
                if (streamValData?.hook?.resource?.addr !== "") {
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
            // console.log(streamValData);
            // if (
            //   streamValData.changes.add != 0 &&
            //   streamValData["@level"] === "error"
            // ) {
            //   getDesiredState(infra_id, false);
            // }
            default:
          }
        }

        updateModuleResources(infra_id, [
          ...addedResources,
          ...erroredResources,
        ]);

        updateGlobalErrorsForModule(infra_id, globalErrors);
      },

      onclose: () => {
        console.log(`closing websocket for infra_id: ${websocketId}`);
      },

      onerror: (err: ErrorEvent) => {
        console.log(err);
        closeWebsocket(`${websocketId}`);
      },
    };

    newWebsocket(websocketId, apiPath, wsConfig);
    openWebsocket(websocketId);
  };

  useEffect(() => {
    getInfras();
    return () => {
      closeAllWebsockets();
    };
  }, []);

  useEffect(() => {
    if (!tfModules?.length) {
      setInfraStatus(null);
      return;
    }
    const hasModuleWithError = tfModules.find(
      (module) => module.status === "error"
    );
    const hasModuleInCreatingState = tfModules.find(
      (module) => module.status === "creating"
    );

    if (hasModuleInCreatingState) {
      setInfraStatus(null);
      return;
    }

    if (!hasModuleInCreatingState && !hasModuleWithError) {
      setInfraStatus({ hasError: false });
      return;
    }

    if (!hasModuleInCreatingState && hasModuleWithError) {
      setInfraStatus({ hasError: true });
      return;
    }
  }, [tfModules]);

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
    updatedResources: TFResource[]
  ) => {
    const selectedModule = getModule(infraId);

    const updatedModuleResources = selectedModule.resources.map((resource) => {
      const correspondedResource: TFResource = updatedResources.find(
        (updatedResource) => updatedResource.addr === resource.addr
      );
      if (!correspondedResource) {
        return resource;
      }
      let errored = undefined;

      if (correspondedResource?.errored) {
        errored = {
          ...(correspondedResource?.errored || {}),
        };
      }

      return {
        ...resource,
        provisioned: correspondedResource.provisioned,
        errored,
      };
    });

    selectedModule.resources = updatedModuleResources;

    const isModuleCreated =
      selectedModule.resources.every((resource) => {
        return resource.provisioned;
      }) && !selectedModule.global_errors?.length;

    const isModuleOnError =
      selectedModule.resources.find((resource) => {
        return resource.errored?.errored_out;
      }) || selectedModule.global_errors?.length;

    if (isModuleCreated) {
      selectedModule.status = "created";
    } else if (isModuleOnError) {
      selectedModule.status = "error";
    } else {
      selectedModule.status = selectedModule.status;
    }

    setModule(infraId, selectedModule);
  };

  const updateGlobalErrorsForModule = (
    infraId: number,
    globalErrors: TFResourceError[]
  ) => {
    const module = getModule(infraId);

    module.global_errors = [...(module.global_errors || []), ...globalErrors];
    if (globalErrors.length) {
      module.status = "error";
    }
    setModule(infraId, module);
  };

  return {
    tfModules,
    initModule,
    updateDesired,
    updateModuleResources,
    updateGlobalErrorsForModule,
  };
};
