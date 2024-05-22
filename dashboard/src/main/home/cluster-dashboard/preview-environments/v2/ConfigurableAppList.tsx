import React, { useContext, useMemo, useState } from "react";
import { useHistory } from "react-router";
import styled from "styled-components";

import Loading from "components/Loading";
import Button from "components/porter/Button";
import Container from "components/porter/Container";
import DashboardPlaceholder from "components/porter/DashboardPlaceholder";
import Image from "components/porter/Image";
import SearchBar from "components/porter/SearchBar";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import { useDeploymentTargetList } from "lib/hooks/useDeploymentTarget";
import { useAppInstances } from "lib/hooks/useLatestAppRevisions";
import { useTemplateEnvs } from "lib/hooks/useTemplateEnvs";

import { Context } from "shared/Context";
import add from "assets/plus-square.svg";

import { ConfigurableAppRow } from "./ConfigurableAppRow";

export const ConfigurableAppList: React.FC = () => {
  const history = useHistory();
  const queryParams = new URLSearchParams(window.location.search);
  const [searchValue, setSearchValue] = useState("");

  const { currentProject, currentCluster } = useContext(Context);

  const { instances: appInstances } = useAppInstances({
    projectId: currentProject?.id ?? 0,
    clusterId: currentCluster?.id ?? 0,
  });
  const { deploymentTargetList } = useDeploymentTargetList({ preview: false });

  const { environments, status } = useTemplateEnvs();

  const filteredEnvs = useMemo(() => {
    const activeAppInstances = appInstances.filter((ai) =>
      deploymentTargetList.some((dt) => dt.id === ai.deployment_target.id)
    );

    const withBaseAppInstance = environments.map((env) => {
      const existingAppInstance = activeAppInstances.find(
        (ai) => ai.name === env.name
      );

      return {
        ...env,
        existingAppInstance,
      };
    });

    return withBaseAppInstance;
  }, [environments, deploymentTargetList, searchValue]);

  if (status === "loading") {
    return <Loading offset="-150px" />;
  }

  if (appInstances.length === 0) {
    return (
      <DashboardPlaceholder>
        <Text size={16}>No apps have been deployed yet.</Text>
        <Spacer y={0.5} />
        <Text color={"helper"}>Get started by creating a new app.</Text>
        <Spacer y={1} />
        <Button
          alt
          height="35px"
          onClick={() => {
            history.push("/apps/new/app");
          }}
        >
          Create App
        </Button>
      </DashboardPlaceholder>
    );
  }

  return (
    <>
      <Container row spaced>
        <SearchBar
          value={searchValue}
          setValue={(x) => {
            setSearchValue(x);
          }}
          placeholder="Search environment templates . . ."
          width="100%"
        />
        <Spacer inline x={1} />
        <Button
          onClick={() => {
            history.push({
              pathname: "/preview-environments/configure",
            });
          }}
          height="30px"
          width="140px"
        >
          <Container row>
            <Image src={add} size={12} />
            <Spacer inline x={0.5} />
            <Text>New Template</Text>
          </Container>
        </Button>
      </Container>
      <Spacer y={1} />
      <List>
        {filteredEnvs.map((ev) => (
          <ConfigurableAppRow
            key={ev.name}
            setEditingApp={() => {
              queryParams.set("app_name", ev.name);
              if (ev.existingAppInstance?.deployment_target.id) {
                queryParams.set(
                  "target",
                  ev.existingAppInstance.deployment_target.id.toString()
                );
              }

              history.push({
                pathname: "/preview-environments/configure",
                search: queryParams.toString(),
              });
            }}
            env={ev}
          />
        ))}
      </List>
    </>
  );
};

const List = styled.div`
  overflow: hidden;
`;
