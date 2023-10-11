import React, { useEffect, useMemo, useState } from "react";
import styled from "styled-components";

import api from "shared/api";

import { useQuery } from "@tanstack/react-query";
import yaml from "js-yaml";
import YamlEditor from "components/YamlEditor";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import Checkbox from "components/porter/Checkbox";
import {z} from "zod";
import {match} from "ts-pattern/dist";
import loading from "assets/loading.gif";

type PropsType = {
  projectId: number;
  clusterId: number;
  appName: string;
  appId: number;
  deploymentTargetId: string;
};

const HelmLatestValues: React.FunctionComponent<PropsType> = ({
  projectId,
  clusterId,
  appName,
  appId,
  deploymentTargetId,
}) => {

    const [withDefaults, setWithDefaults] = React.useState<boolean>(false);

    const res = useQuery(
      [
        "getAppHelmValues",
        projectId,
        clusterId,
        appName,
        appId,
        deploymentTargetId,
        withDefaults,
      ],
      async () => {

          const helmValues = await api.appHelmValues(
              "<token>",
              {
                app_id: appId,
                deployment_target_id: deploymentTargetId,
                with_defaults: withDefaults,
              },
              {
                project_id: projectId,
                cluster_id: clusterId,
                porter_app_name: appName,
              }
          );

          const parsed = await z.object({helm_values: z.string()}).parseAsync(helmValues.data);

          return yaml.dump(JSON.parse(parsed.helm_values));
      },
      {
        enabled: appName !== "",
        refetchOnWindowFocus: false,
      }
  );

  return (
      <>
      <Checkbox
          checked={withDefaults}
          toggleChecked={() => setWithDefaults(!withDefaults)}
      >
          <Text color="helper">
              Include default Helm values
          </Text>
      </Checkbox>
      <Spacer y={1} />
          {match(res)
              .with({ status: "loading" }, () => (
                  <LoadingPlaceholder>
                      <StatusWrapper>
                          <LoadingGif src={loading} revision={false} /> Updating . . .
                      </StatusWrapper>
                  </LoadingPlaceholder>
              ))
              .with({ status: "success" }, ({ data }) => (
                  <StyledValuesYaml>
                      <Wrapper>
                          <YamlEditor
                              value={data}
                              height="calc(100vh - 412px)"
                              readOnly={true}
                          />
                      </Wrapper>
                      <Spacer y={0.5} />
                  </StyledValuesYaml>
              ))
              .otherwise(() => null)}
      </>
  );

}

export default HelmLatestValues;

const Wrapper = styled.div`
  overflow: auto;
  border-radius: 8px;
  border: 1px solid #ffffff33;
`;

const StyledValuesYaml = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: calc(100vh - 350px);
  font-size: 13px;
  overflow: hidden;
  border-radius: 8px;
  animation: floatIn 0.3s;
  animation-timing-function: ease-out;
  animation-fill-mode: forwards;
  @keyframes floatIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0px);
    }
  }
`;

const StatusWrapper = styled.div`
  display: flex;
  align-items: center;
  font-family: "Work Sans", sans-serif;
  font-size: 13px;
  color: #ffffff55;
  margin-right: 25px;
`;


const LoadingPlaceholder = styled.div`
  height: 40px;
  display: flex;
  align-items: center;
  padding-left: 20px;
`;

const LoadingGif = styled.img`
  width: 15px;
  height: 15px;
  margin-right: ${(props: { revision: boolean }) =>
    props.revision ? "0px" : "9px"};
  margin-left: ${(props: { revision: boolean }) =>
    props.revision ? "10px" : "0px"};
  margin-bottom: ${(props: { revision: boolean }) =>
    props.revision ? "-2px" : "0px"};
`;
