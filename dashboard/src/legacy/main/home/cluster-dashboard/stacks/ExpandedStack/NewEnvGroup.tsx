import React, { useContext } from "react";
import { AxiosError } from "axios";
import api from "legacy/shared/api";
import { useRouting } from "legacy/shared/routing";

import { Context } from "shared/Context";

import NewEnvGroupForm from "../components/NewEnvGroupForm";
import { CreateStackBody } from "../types";
import { ExpandedStackStore } from "./Store";

const NewEnvGroup = () => {
  const { stack, refreshStack } = useContext(ExpandedStackStore);
  const { currentProject, currentCluster } = useContext(Context);

  const { pushFiltered } = useRouting();

  const createEnvGroup = async (
    newEnvGroup: CreateStackBody["env_groups"][0]
  ) => {
    try {
      await api.addStackEnvGroup(
        "<token>",
        {
          ...newEnvGroup,
        },
        {
          project_id: currentProject.id,
          cluster_id: currentCluster.id,
          namespace: stack.namespace,
          stack_id: stack.id,
        }
      );

      await refreshStack();
      pushFiltered("../" + stack.id, []);
    } catch (error) {
      const axiosError: AxiosError = error;

      if (axiosError.code === "404" || axiosError.code === "405") {
        throw "New env group not implemented";
      }

      if (axiosError.code === "409") {
        throw "Name is already in use";
      }

      if (error?.message) {
        throw error.message;
      }

      throw error;
    }
  };

  return (
    <>
      <NewEnvGroupForm
        onSubmit={createEnvGroup}
        onCancel={() => {
          pushFiltered("../" + stack.id, []);
        }}
      />
    </>
  );
};

export default NewEnvGroup;
