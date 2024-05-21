import React, { useContext } from "react";
import { useRouting } from "shared/routing";
import styled from "styled-components";
import NewEnvGroupForm from "../components/NewEnvGroupForm";
import { StacksLaunchContext } from "./Store";

const NewEnvGroup = () => {
  const { addEnvGroup } = useContext(StacksLaunchContext);

  const { pushFiltered } = useRouting();

  return (
    <NewEnvGroupForm
      onSubmit={async (newEnvGroup) => {
        addEnvGroup({
          ...newEnvGroup,
          linked_applications: [],
        });
        pushFiltered("/stacks/launch/overview", []);
        return;
      }}
      onCancel={() => {
        pushFiltered("/stacks/launch/overview", []);
        return;
      }}
    />
  );
};

export default NewEnvGroup;
