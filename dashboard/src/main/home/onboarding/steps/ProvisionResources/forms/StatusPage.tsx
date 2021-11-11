import ProvisionerStatus, {
  TFModule,
  TFResource,
  TFResourceError,
} from "components/ProvisionerStatus";
import React, { useEffect, useRef, useState } from "react";
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
  filter: selectedFilters,
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

  const filterBySelectedInfras = (currentInfra: Infra) => {
    if (!Array.isArray(selectedFilters) || !selectedFilters?.length) {
      return true;
    }

    if (selectedFilters.includes(currentInfra.kind)) {
      return true;
    }
    return false;
  };

  const getLatestInfras = (infras: Infra[]) => {
    // Create a map with the relation infra.kind => infra
    // This will allow us to keep only one infra per kind.
    const infraMap = new Map<string, Infra>();

    infras.forEach((infra) => {
      // Get last infra from that kind, kind being gke, ecr, etc.
      const latestSavedInfra = infraMap.get(infra.kind);

      // If infra doesn't exists, it means its the first one appearing so we save it
      if (!latestSavedInfra) {
        infraMap.set(infra.kind, infra);
        return;
      }

      // Check if the latest saved infra was recent than the one we're currently iterating
      // If the current one iterating is newer, then we update the map!
      if (
        new Date(infra.created_at).getTime() >
        new Date(latestSavedInfra.created_at).getTime()
      ) {
        infraMap.set(infra.kind, infra);
        return;
      }
    });

    // Get the array from the values of the array.
    return Array.from(infraMap.values());
  };

  const getInfras = async () => {
    try {
      const res = await api.getInfra<Infra[]>(
        "<token>",
        {},
        { project_id: project_id }
      );
      // Filter infras based on what we care only, usually on the onboarding we'll want only the ones
      // currently being provisioned
      const matchedInfras = res.data.filter(filterBySelectedInfras);

      // Get latest infras for each kind of infra on the array.
      const latestMatchedInfras = getLatestInfras(matchedInfras);

      // Check if all infras are created then enable continue button
      if (latestMatchedInfras.every((infra) => infra.status === "created")) {
        setInfraStatus({
          hasError: false,
        });
      }

      // Init tf modules based on matched infras
      latestMatchedInfras.forEach((infra) => {
        // Init the module for the hook
        initModule(infra);

        // Update all the resources needed for the current infra
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
      // Check if we have some modules already provisioned
      await getProvisionedModules(infra_id);

      // Connect to websocket that will provide live info of the provisioning for this infra
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
  [infraId: number]: TFModule;
};

const useTFModules = () => {
  // Use a ref to keep track of all the Terraform modules
  const modules = useRef<TFModulesState>({});

  // Use state to keep the reactive array of terraform modules
  const [tfModules, setTfModules] = useState<TFModule[]>([]);

  /**
   * This will map out the ref containing all the terraform modules and return a sorted array.
   */
  const updateTFModules = (): void => {
    if (typeof modules.current !== "object") {
      setTfModules([]);
    }

    const sortedModules = Object.values(modules.current).sort((a, b) =>
      b.id < a.id ? -1 : b.id > a.id ? 1 : 0
    );
    setTfModules(sortedModules);
  };

  /**
   * Init a TFModule based on a Infra, this infra is usually more basic
   * and doesn't contain all the resources that it actually needs.
   * The initialized TFModule will be used to keep track if the infra
   * changed from creating status to another one.
   *
   * @param infra Infra object used to initialize the terraform module used to track provisioning status
   */
  const initModule = (infra: Infra) => {
    const module: TFModule = {
      id: infra.id,
      kind: infra.kind,
      status: infra.status,
      got_desired: false,
      created_at: infra.created_at,
    };
    setModule(infra.id, module);
  };

  /**
   * Add or replace if existed, this function will set the module into the ref
   * and call the updateTFModules to update the array used to show the infras
   *
   * @param infraId Infra ID to be updated
   * @param module New updated module
   */
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

  /**
   * @param infraId Module to be updated
   * @param desired All the desired resources that are going to be needed to complete provisioning
   */
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

  /**
   * @param infraId Module to be updated
   * @param updatedResources Updated resources array, this may contain one or more objects with some status updates.
   */
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

  /**
   * @param infraId Module to be updated
   * @param globalErrors Errors that may not belong to a resource but appeared during provisioning
   */
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
