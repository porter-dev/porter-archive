import _ from "lodash";
import React, { useContext } from "react";
import { useParams } from "react-router";
import { useRouting } from "shared/routing";
import { StacksLaunchContext } from "./Store";
import styled from "styled-components";
import NewAppResourceForm from "../components/NewAppResourceForm";

const DEFAULT_STACK_SOURCE_CONFIG_INDEX = 0;

const NewApp = () => {
  const { addAppResource, newStack, namespace } = useContext(
    StacksLaunchContext
  );

  const params = useParams<{
    template_name: string;
    version: string;
  }>();

  const { pushFiltered } = useRouting();

  return (
    <>
      <NewAppResourceForm
        sourceConfig={
          newStack.source_configs[DEFAULT_STACK_SOURCE_CONFIG_INDEX]
        }
        availableEnvGroups={newStack.env_groups}
        namespace={namespace}
        templateInfo={{
          name: params.template_name,
          version: params.version,
        }}
        onSubmit={async (newApp, syncedEnvGroups) => {
          addAppResource(newApp, syncedEnvGroups);
          pushFiltered("/stacks/launch/overview", []);
          return;
        }}
        onCancel={() => {
          pushFiltered("/stacks/launch/overview", []);
        }}
      />
    </>
  );
};

export default NewApp;

const Required = styled.div`
  margin-left: 8px;
  color: #fc4976;
  display: inline-block;
`;

const Wrapper = styled.div`
  margin-top: calc(50vh - 150px);
`;

const StyledLaunchFlow = styled.div`
  min-width: 300px;
  width: calc(100% - 100px);
  margin-left: 50px;
  margin-top: ${(props: { disableMarginTop?: boolean }) =>
    props.disableMarginTop ? "inherit" : "calc(50vh - 380px)"};
  padding-bottom: 150px;
`;
