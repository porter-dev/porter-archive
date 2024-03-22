import React, { useContext, useState } from "react";
import styled from "styled-components";
import { match } from "ts-pattern";

import ClusterProvisioningPlaceholder from "components/ClusterProvisioningPlaceholder";
import Loading from "components/Loading";
import Button from "components/porter/Button";
import Container from "components/porter/Container";
import DashboardPlaceholder from "components/porter/DashboardPlaceholder";
import PorterLink from "components/porter/Link";
import ShowIntercomButton from "components/porter/ShowIntercomButton";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import TabSelector from "components/TabSelector";
import { useDeploymentTargetList } from "lib/hooks/useDeploymentTarget";

import { Context } from "shared/Context";
import prGrad from "assets/pr-grad.svg";

import DashboardHeader from "../../DashboardHeader";
import { ConfigurableAppList } from "./ConfigurableAppList";
import PreviewEnvGrid from "./PreviewEnvGrid";

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
          <Text size={16}>Preview apps are coming soon to the Porter Cloud</Text>
          <Spacer y={0.5} />
          <Text color={"helper"}>
            You can also eject to your own cloud account to start using preview
            apps immediately.
          </Text>
          <Spacer y={1} />
          <PorterLink to="https://docs.porter.run/other/eject" target="_blank">
            <Button alt height="35px">
             Eject to AWS, Azure, or GCP.
            </Button>
          </PorterLink>
        </DashboardPlaceholder>
      );
    }

    if (!currentProject?.preview_envs_enabled) {
      return (
        <DashboardPlaceholder>
          <Text size={16}>Preview apps are not enabled for this project</Text>
          <Spacer y={0.5} />
          <Text color={"helper"}>
            Reach out to the Porter team to enable preview apps on your project.
          </Text>
          <Spacer y={1} />
          <ShowIntercomButton
            alt
            message="I would like to enable preview apps on my project"
            height="35px"
          >
            Request to enable
          </ShowIntercomButton>
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
    );
  };

  return (
    <StyledAppDashboard>
      <DashboardHeader
        image={prGrad}
        title={
          <Container row>
            Preview apps
            <Spacer inline x={1} />
            <Badge>Beta</Badge>
          </Container>
        }
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

const Badge = styled.div`
  background: linear-gradient(60deg, #4b366d 0%, #6475b9 100%);
  color: white;
  border-radius: 3px;
  padding: 2px 5px;
  margin-right: -5px;
  font-size: 13px;
`;

const StyledAppDashboard = styled.div`
  width: 100%;
  height: 100%;
`;
