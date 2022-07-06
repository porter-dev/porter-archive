import React, { createContext, useContext, useState } from "react";
import api from "shared/api";
import { Context } from "shared/Context";
import { CreateStackBody } from "../types";

export type StacksLaunchContextType = {
  newStack: CreateStackBody;

  namespace: string;

  setStackName: (name: string) => void;
  setStackNamespace: (namespace: string) => void;

  addSourceConfig: (
    sourceConfig: Omit<CreateStackBody["source_configs"][0], "name">
  ) => void;

  addAppResource: (
    appResource: CreateStackBody["app_resources"][0],
    syncedEnvGroups: string[]
  ) => void;

  removeAppResource: (appResource: CreateStackBody["app_resources"][0]) => void;

  addEnvGroup: (envGroup: CreateStackBody["env_groups"][0]) => void;

  removeEnvGroup: (envGroup: CreateStackBody["env_groups"][0]) => void;

  submit: () => Promise<void>;
};

const defaultValues: StacksLaunchContextType = {
  newStack: {
    name: "",
    app_resources: [],
    source_configs: [],
    env_groups: [],
  },

  namespace: "",

  setStackName: (name: string) => {},
  setStackNamespace: (namespace: string) => {},

  addSourceConfig: (
    sourceConfig: Omit<CreateStackBody["source_configs"][0], "name">
  ) => {},

  addAppResource: (appResource: CreateStackBody["app_resources"][0]) => {},

  removeAppResource: (appResource: CreateStackBody["app_resources"][0]) => {},

  addEnvGroup: () => {},

  removeEnvGroup: (envGroup: CreateStackBody["env_groups"][0]) => {},

  submit: async () => {},
};

export const StacksLaunchContext = createContext<StacksLaunchContextType>(
  defaultValues
);

const StacksLaunchContextProvider: React.FC<{}> = ({ children }) => {
  const { currentProject, currentCluster, setCurrentError } = useContext(
    Context
  );
  const [newStack, setNewStack] = useState<CreateStackBody>(
    defaultValues.newStack
  );
  const [namespace, setNamespace] = useState("default");

  const setStackName: StacksLaunchContextType["setStackName"] = (name) => {
    setNewStack((prev) => ({
      ...prev,
      name,
    }));
  };

  const setStackNamespace: StacksLaunchContextType["setStackNamespace"] = (
    namespace
  ) => {
    setNamespace(namespace);
  };

  const addSourceConfig: StacksLaunchContextType["addSourceConfig"] = (
    sourceConfig
  ) => {
    const newSourceConfigName = (index: number) =>
      sourceConfig.build
        ? `${sourceConfig.build.method}-${index}`
        : `${sourceConfig.image_repo_uri}-${sourceConfig.image_tag}-${index}`;

    setNewStack((prev) => ({
      ...prev,
      source_configs: [
        ...prev.source_configs,
        {
          name: newSourceConfigName(prev.source_configs.length),
          ...sourceConfig,
        },
      ],
    }));
  };

  const addAppResource: StacksLaunchContextType["addAppResource"] = (
    appResource,
    syncedEnvGroups
  ) => {
    setNewStack((prev) => {
      const envGroups = syncedEnvGroups
        .map((envGroupName) => {
          return prev.env_groups.find(
            (envGroup) => envGroup.name === envGroupName
          );
        })
        .map((envGroup) => {
          return {
            ...envGroup,
            linked_applications: [
              ...envGroup.linked_applications,
              appResource.name,
            ],
          };
        });

      // Replace prev.envGroups with envGroups based on name
      const newEnvGroups = prev.env_groups.map((envGroup) => {
        const newEnvGroup = envGroups.find(
          (envGroup2) => envGroup2.name === envGroup.name
        );
        return newEnvGroup ? newEnvGroup : envGroup;
      });

      return {
        ...prev,
        app_resources: [...prev.app_resources, appResource],
        env_groups: newEnvGroups,
      };
    });
  };

  const removeAppResource: StacksLaunchContextType["removeAppResource"] = (
    appResource
  ) => {
    setNewStack((prev) => {
      const removedAppName = appResource.name;
      const newEnvGroups = prev.env_groups.map((envGroup) => {
        const newLinkedApplications = envGroup.linked_applications.filter(
          (linkedApplication) => linkedApplication !== removedAppName
        );
        return {
          ...envGroup,
          linked_applications: newLinkedApplications,
        };
      });

      return {
        ...prev,
        app_resources: prev.app_resources.filter(
          (ar) => ar.name !== appResource.name
        ),
        env_groups: newEnvGroups,
      };
    });
  };

  const addEnvGroup: StacksLaunchContextType["addEnvGroup"] = (envGroup) => {
    setNewStack((prev) => ({
      ...prev,
      env_groups: [...prev.env_groups, envGroup],
    }));
  };

  const removeEnvGroup: StacksLaunchContextType["removeEnvGroup"] = (
    envGroup
  ) => {
    setNewStack((prev) => {
      const removedEnvGroup = prev.env_groups.find(
        (eg) => eg.name === envGroup.name
      );

      if (removedEnvGroup.linked_applications.length > 0) {
        const formatter = new Intl.ListFormat("en", {
          style: "long",
          type: "conjunction",
        });

        setCurrentError(
          `Cannot remove env group ${
            envGroup.name
          } because it is linked to applications: ${formatter.format(
            removedEnvGroup.linked_applications
          )}`
        );
        return prev;
      }

      return {
        ...prev,
        env_groups: prev.env_groups.filter((eg) => eg.name !== envGroup.name),
      };
    });
  };

  const submit: StacksLaunchContextType["submit"] = async () => {
    try {
      await api.createStack("<token>", newStack, {
        cluster_id: currentCluster.id,
        namespace: namespace,
        project_id: currentProject.id,
      });
    } catch (error) {
      setCurrentError(error);
      throw error;
    }
  };

  return (
    <StacksLaunchContext.Provider
      value={{
        newStack,
        namespace,
        setStackName,
        setStackNamespace,
        addSourceConfig,
        addAppResource,
        removeAppResource,
        addEnvGroup,
        removeEnvGroup,
        submit,
      }}
    >
      {children}
    </StacksLaunchContext.Provider>
  );
};

export default StacksLaunchContextProvider;
