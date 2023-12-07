import React, { useState } from "react";
import styled from "styled-components";

import Loading from "components/Loading";
import Container from "components/porter/Container";
import Fieldset from "components/porter/Fieldset";
import SearchBar from "components/porter/SearchBar";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import Toggle from "components/porter/Toggle";
import { useDeploymentTargetList } from "lib/hooks/useDeploymentTarget";

import calendar from "assets/calendar-number.svg";
import grid from "assets/grid.png";
import list from "assets/list.png";
import PullRequestIcon from "assets/pull_request_icon.svg";
import letter from "assets/vector.svg";

import DashboardHeader from "../../DashboardHeader";
import PreviewEnvGrid from "./PreviewEnvGrid";

const PreviewEnvs: React.FC = () => {
  const [searchValue, setSearchValue] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [sort, setSort] = useState<"calendar" | "letter">("calendar");

  const { deploymentTargetList, isDeploymentTargetListLoading } =
    useDeploymentTargetList({ preview: true });

  const renderContents = (): JSX.Element => {
    if (isDeploymentTargetListLoading) {
      return <Loading offset="-150px" />;
    }

    if (deploymentTargetList.length === 0) {
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
          deploymentTargets={deploymentTargetList}
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
