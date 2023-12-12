import React, { useState } from "react";
import styled from "styled-components";
import { match } from "ts-pattern";

import Loading from "components/Loading";
import Spacer from "components/porter/Spacer";
import TabSelector from "components/TabSelector";
import { useDeploymentTargetList } from "lib/hooks/useDeploymentTarget";

import PullRequestIcon from "assets/pull_request_icon.svg";

import DashboardHeader from "../../DashboardHeader";
import { ConfigurableAppList } from "./ConfigurableAppList";
import PreviewEnvGrid from "./PreviewEnvGrid";

const tabs = ["environments", "config"] as const;
export type ValidTab = (typeof tabs)[number];

const PreviewEnvs: React.FC = () => {
  const [tab, setTab] = useState<ValidTab>("environments");

  const { deploymentTargetList, isDeploymentTargetListLoading } =
    useDeploymentTargetList({ preview: true });

  const renderContents = (): JSX.Element => {
    if (isDeploymentTargetListLoading) {
      return <Loading offset="-150px" />;
    }

    return match(tab)
      .with("environments", () => (
        <PreviewEnvGrid
          deploymentTargets={deploymentTargetList}
          setTab={setTab}
        />
      ))
      .with("config", () => <ConfigurableAppList />)
      .exhaustive();
  };

  return (
    <StyledAppDashboard>
      <DashboardHeader
        image={PullRequestIcon}
        title="Preview Environments"
        description="Preview environments are created for each pull request. They are automatically deleted when the pull request is closed."
        disableLineBreak
      />
      <TabSelector
        noBuffer
        options={[
          { label: "Environments", value: "environments" },
          { label: "Settings", value: "config" },
        ]}
        currentTab={tab}
        setCurrentTab={(tab: string) => {
          if (tab === "environments") {
            setTab("environments");
            return;
          }
          setTab("config");
        }}
      />
      <Spacer y={1} />
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
