import { AxiosError } from "axios";
import React, { useContext } from "react";
import { useParams } from "react-router";
import api from "shared/api";
import { Context } from "shared/Context";
import { useRouting } from "shared/routing";
import NewEnvGroupForm from "../components/NewEnvGroupForm";
import { CreateStackBody } from "../types";

const NewEnvGroup = () => {
  const { currentProject, currentCluster } = useContext(Context);
  const { stack_id, namespace } = useParams<{
    stack_id: string;
    namespace: string;
  }>();
  const { pushFiltered } = useRouting();

  const createEnvGroup = async (
    newEnvGroup: CreateStackBody["env_groups"][0]
  ) => {
    try {
      await api.addStackEnvGroup(
        "<token>",
        {
          env_group: newEnvGroup,
        },
        {
          project_id: currentProject.id,
          cluster_id: currentCluster.id,
          namespace,
          stack_id,
        }
      );
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
          pushFiltered("../" + stack_id, []);
        }}
      />
    </>
  );
};

export default NewEnvGroup;
