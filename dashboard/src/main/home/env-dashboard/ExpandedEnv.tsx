import React, { useContext, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useHistory, useParams } from "react-router";
import styled from "styled-components";
import { match } from "ts-pattern";
import { z } from "zod";

import Loading from "components/Loading";
import Back from "components/porter/Back";
import Container from "components/porter/Container";
import Image from "components/porter/Image";
import Link from "components/porter/Link";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import TabSelector from "components/TabSelector";
import { envGroupValidator } from "lib/env-groups/types";

import api from "shared/api";
import { Context } from "shared/Context";
import database from "assets/database.svg";
import doppler from "assets/doppler.png";
import infisical from "assets/infisical.svg";
import key from "assets/key.svg";
import notFound from "assets/not-found.png";
import time from "assets/time.png";

import { envGroupPath } from "../../../shared/util";
import EnvVarsTab from "./tabs/EnvVarsTab";
import SettingsTab from "./tabs/SettingsTab";
import SyncedAppsTab from "./tabs/SyncedAppsTab";

const getReadableDate = (s: string): string => {
  const ts = new Date(s);
  const date = ts.toLocaleDateString();
  const time = ts.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${time} on ${date}`;
};

const ExpandedEnv: React.FC = () => {
  const { currentProject, currentCluster } = useContext(Context);
  const { envGroupName, tab } = useParams<{
    envGroupName: string;
    tab: string;
  }>();
  const history = useHistory();

  const tabs = useMemo(() => {
    return [
      { label: "Environment variables", value: "env-vars" },
      { label: "Synced applications", value: "synced-apps" },
      { label: "Settings", value: "settings" },
    ];
  }, []);

  const {
    data: envGroup,
    isLoading,
    refetch,
  } = useQuery(
    ["envGroups", currentProject?.id, currentCluster?.id, envGroupName],
    async () => {
      if (!currentProject || !currentCluster) {
        return null;
      }
      const res = await api.getAllEnvGroups(
        "<token>",
        {},
        {
          id: currentProject?.id || -1,
          cluster_id: currentCluster?.id || -1,
        }
      );

      const data = await z
        .object({
          environment_groups: z.array(envGroupValidator),
        })
        .parseAsync(res.data);

      return data.environment_groups.find((eg) => eg.name === envGroupName);
    }
  );

  useEffect(() => {
    if (!tab) {
      history.push(envGroupPath(currentProject, `/${envGroupName}/env-vars`));
    }
  }, [tab]);

  const envGroupIcon = useMemo(() => {
    if (envGroup?.type === "doppler") {
      return doppler;
    }
    if (envGroup?.type === "datastore") {
      return database;
    }
    if (envGroup?.type === "infisical") {
      return infisical;
    }
    return key;
  }, [envGroup?.type]);

  return (
    <>
      {isLoading && <Loading />}
      {!isLoading && !envGroup && (
        <Placeholder>
          <Container row>
            <Image src={notFound} size={13} opacity={0.65} />
            <Spacer inline x={0.5} />
            <Text color="helper">
              No env group matching &quot;{envGroupName}&quot; was found.
            </Text>
          </Container>
          <Spacer y={1} />
          <Link hasunderline to={envGroupPath(currentProject, "")}>
            Return to dashboard
          </Link>
        </Placeholder>
      )}
      {!isLoading && envGroup && (
        <StyledExpandedApp>
          <Back to={envGroupPath(currentProject, "")} />

          <Container row>
            <Image src={envGroupIcon} size={28} />
            <Spacer inline x={1} />
            <Text size={21}>{envGroupName}</Text>
          </Container>
          <Spacer y={0.5} />
          <Container row>
            <Spacer inline x={0.2} />
            <Image opacity={0.3} src={time} size={14} />
            <Spacer inline x={0.5} />
            <Text color="#aaaabb66">
              Last deployed {getReadableDate(envGroup.created_at)}
            </Text>
          </Container>
          <Spacer y={1} />

          <TabSelector
            noBuffer
            options={tabs}
            currentTab={tab}
            setCurrentTab={(t) => {
              history.push(
                envGroupPath(currentProject, `/${envGroupName}/${t}`)
              );
            }}
          />
          <Spacer y={1} />
          {match(tab)
            .with("env-vars", () => {
              return <EnvVarsTab envGroup={envGroup} fetchEnvGroup={refetch} />;
            })
            .with("synced-apps", () => <SyncedAppsTab envGroup={envGroup} />)
            .with("settings", () => <SettingsTab envGroup={envGroup} />)
            .otherwise(() => null)}
          <Spacer y={2} />
        </StyledExpandedApp>
      )}
    </>
  );
};

export default ExpandedEnv;

const Placeholder = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  font-size: 13px;
`;

const StyledExpandedApp = styled.div`
  width: 100%;
  height: 100%;

  animation: fadeIn 0.5s 0s;
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;
