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

  addAppResource: (appResource: CreateStackBody["app_resources"][0]) => void;

  removeAppResource: (appResource: CreateStackBody["app_resources"][0]) => void;

  submit: () => Promise<void>;
};

const defaultValues: StacksLaunchContextType = {
  newStack: {
    name: "",
    app_resources: [],
    source_configs: [],
  },

  namespace: "",

  setStackName: (name: string) => {},
  setStackNamespace: (namespace: string) => {},

  addSourceConfig: (
    sourceConfig: Omit<CreateStackBody["source_configs"][0], "name">
  ) => {},

  addAppResource: (appResource: CreateStackBody["app_resources"][0]) => {},

  removeAppResource: (appResource: CreateStackBody["app_resources"][0]) => {},

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
    appResource
  ) => {
    setNewStack((prev) => ({
      ...prev,
      app_resources: [...prev.app_resources, appResource],
    }));
  };

  const removeAppResource: StacksLaunchContextType["removeAppResource"] = (
    appResource
  ) => {
    setNewStack((prev) => ({
      ...prev,
      app_resources: prev.app_resources.filter(
        (ar) => ar.name !== appResource.name
      ),
    }));
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
        submit,
      }}
    >
      {children}
    </StacksLaunchContext.Provider>
  );
};

export default StacksLaunchContextProvider;
