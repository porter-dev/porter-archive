import React, { useState, useContext } from "react";
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
import { Context } from "shared/Context";
import ClusterProvisioningPlaceholder from "components/ClusterProvisioningPlaceholder";
import DashboardPlaceholder from "components/porter/DashboardPlaceholder";
import Text from "components/porter/Text";

const tabs = ["environments", "config"] as const;
export type ValidTab = (typeof tabs)[number];

const PreviewEnvs: React.FC = () => {
  const { currentProject, currentCluster } = useContext(Context);
  const [tab, setTab] = useState<ValidTab>("environments");

  const { deploymentTargetList, isDeploymentTargetListLoading } =
    useDeploymentTargetList({ preview: true });

  const renderTab = (): JSX.Element => {
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

  const renderContents = (): JSX.Element => {
    if (currentCluster?.status === "UPDATING_UNAVAILABLE") {
      return <ClusterProvisioningPlaceholder />;
    }

    if (currentProject?.sandbox_enabled) {
      return (
        <DashboardPlaceholder>
          <Text size={16}>Preview apps are not enabled for sandbox users</Text>
          <Spacer y={0.5} />

          <Text color={"helper"}>
            Eject to your own cloud account to enable preview apps.
          </Text>
        </DashboardPlaceholder>
      );
    }

    if (!currentProject?.db_enabled) {
      return (
        <DashboardPlaceholder>
          <Text size={16}>Preview apps are not enabled for this project</Text>
          <Spacer y={0.5} />

          <Text color={"helper"}>
            Reach out to support@porter.run to enable preview apps on your project.
          </Text>
        </DashboardPlaceholder>
      );
    }

    return (
      <>
        <TabSelector
          noBuffer
          options={[
            { label: "Existing Previews", value: "environments" },
            { label: "Preview Templates", value: "config" },
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
        {renderTab()}
      </>
    )
  }

  return (
    <StyledAppDashboard>
      <DashboardHeader
        image={PullRequestIcon}
        title="Preview apps"
        capitalize={false}
        description="Preview apps are created for each pull request. They are automatically deleted when the pull request is closed."
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
