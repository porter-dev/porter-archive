import { useQuery } from "@tanstack/react-query";
import Loading from "components/Loading";
import Container from "components/porter/Container";
import Link from "components/porter/Link";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import React, { useContext, useState } from "react";
import { Context } from "shared/Context";
import api from "shared/api";
import styled from "styled-components";
import { z } from "zod";

import PullRequestIcon from "assets/pull_request_icon.svg";
import grid from "assets/grid.png";
import list from "assets/list.png";
import letter from "assets/vector.svg";
import calendar from "assets/calendar-number.svg";

import PorterLink from "components/porter/Link";
import SearchBar from "components/porter/SearchBar";
import Toggle from "components/porter/Toggle";
import DashboardHeader from "../../DashboardHeader";
import Fieldset from "components/porter/Fieldset";
import Button from "components/porter/Button";
import PreviewEnvGrid from "./PreviewEnvGrid";

const rawDeploymentTargetValidator = z.object({
  id: z.string(),
  project_id: z.number(),
  cluster_id: z.number(),
  selector: z.string(),
  selector_type: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type RawDeploymentTarget = z.infer<typeof rawDeploymentTargetValidator>;

const PreviewEnvs: React.FC = () => {
  const { currentProject, currentCluster } = useContext(Context);

  const [searchValue, setSearchValue] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [sort, setSort] = useState<"calendar" | "letter">("calendar");

  const { data: deploymentTargets = [], status } = useQuery(
    ["listDeploymentTargets", currentProject?.id, currentCluster?.id],
    async () => {
      if (!currentProject || !currentCluster) {
        return;
      }

      const res = await api.listDeploymentTargets(
        "<token>",
        {
          preview: true,
        },
        {
          project_id: currentProject?.id,
          cluster_id: currentCluster?.id,
        }
      );

      const deploymentTargets = await z
        .object({
          deployment_targets: z.array(rawDeploymentTargetValidator),
        })
        .parseAsync(res.data);

      return deploymentTargets.deployment_targets;
    },
    {
      enabled: !!currentProject && !!currentCluster,
    }
  );

  const renderContents = () => {
    if (status === "loading") {
      return <Loading offset="-150px" />;
    }

    if (!deploymentTargets || deploymentTargets.length === 0) {
      <Fieldset>
        <CentralContainer>
          <Text size={16}>No preview environments have been deployed yet.</Text>
          <Spacer y={1} />

          <Text color={"helper"}>
            Get started by enabling preview envs for your apps.
          </Text>
          <Spacer y={0.5} />
        </CentralContainer>
      </Fieldset>;
    }

    return (
      <>
        <Container row spaced>
          <SearchBar
            value={searchValue}
            setValue={(x) => {
              setSearchValue(x);
            }}
            placeholder="Search environments . . ."
            width="100%"
          />
          <Spacer inline x={2} />
          <Toggle
            items={[
              { label: <ToggleIcon src={calendar} />, value: "calendar" },
              { label: <ToggleIcon src={letter} />, value: "letter" },
            ]}
            active={sort}
            setActive={(x) => {
              if (x === "calendar") {
                setSort("calendar");
              } else {
                setSort("letter");
              }
            }}
          />
          <Spacer inline x={1} />

          <Toggle
            items={[
              { label: <ToggleIcon src={grid} />, value: "grid" },
              { label: <ToggleIcon src={list} />, value: "list" },
            ]}
            active={view}
            setActive={(x) => {
              if (x === "grid") {
                setView("grid");
              } else {
                setView("list");
              }
            }}
          />
        </Container>
        <Spacer y={1} />
        <PreviewEnvGrid
          deploymentTargets={deploymentTargets}
          sort={sort}
          view={view}
          searchValue={searchValue}
        />
      </>
    );
  };

  return (
    <StyledAppDashboard>
      <DashboardHeader
        image={PullRequestIcon}
        title="Preview Environments"
        description="Preview environments are created for each pull request. They are automatically deleted when the pull request is closed."
        disableLineBreak
      />
      {renderContents()}
      <Spacer y={5} />
    </StyledAppDashboard>
  );
};

export default PreviewEnvs;

const StyledAppDashboard = styled.div`
  width: 100%;
  height: 100%;
`;

const CentralContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: left;
  align-items: left;
`;

const ToggleIcon = styled.img`
  height: 12px;
  margin: 0 5px;
  min-width: 12px;
`;

const GridList = styled.div`
  display: grid;
  grid-column-gap: 25px;
  grid-row-gap: 25px;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
`;

const Block = styled.div`
  height: 150px;
  flex-direction: column;
  display: flex;
  justify-content: space-between;
  cursor: pointer;
  padding: 20px;
  color: ${(props) => props.theme.text.primary};
  position: relative;
  border-radius: 5px;
  background: ${(props) => props.theme.clickable.bg};
  border: 1px solid #494b4f;
  :hover {
    border: 1px solid #7a7b80;
  }
  animation: fadeIn 0.3s 0s;
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

const StatusIcon = styled.img`
  position: absolute;
  top: 20px;
  right: 20px;
  height: 18px;
`;

const SmallIcon = styled.img<{ opacity?: string; height?: string }>`
  margin-left: 2px;
  height: ${(props) => props.height || "14px"};
  opacity: ${(props) => props.opacity || 1};
  filter: grayscale(100%);
  margin-right: 10px;
`;
