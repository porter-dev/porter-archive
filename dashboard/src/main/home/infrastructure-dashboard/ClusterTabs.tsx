import React, { useContext, useEffect, useMemo } from "react";
import { Contract } from "@porter-dev/api-contracts";
import AnimateHeight from "react-animate-height";
import { useFormContext } from "react-hook-form";
import { useHistory } from "react-router";
import styled from "styled-components";
import { match } from "ts-pattern";

import Banner from "components/porter/Banner";
import Spacer from "components/porter/Spacer";
import TabSelector from "components/TabSelector";
import { type ClientClusterContract } from "lib/clusters/types";

import { Context } from "shared/Context";
import { valueExists } from "shared/util";

import { useClusterContext } from "./ClusterContextProvider";
import { useClusterFormContext } from "./ClusterFormContextProvider";
import ClusterProvisioningIndicator from "./ClusterProvisioningIndicator";
import ClusterSaveButton from "./ClusterSaveButton";
import AdvancedSettingsTab from "./tabs/AdvancedSettingsTab";
import ClusterOverview from "./tabs/overview/ClusterOverview";
import Settings from "./tabs/Settings";
import SystemStatus from "./tabs/SystemStatus";

const validTabs = ["overview", "settings", "advanced", "systemStatus"] as const;
const DEFAULT_TAB = "overview" as const;
type ValidTab = (typeof validTabs)[number];

type Props = {
  tabParam?: string;
};
const ClusterTabs: React.FC<Props> = ({ tabParam }) => {
  const { user } = useContext(Context);
  const history = useHistory();
  const { cluster, isClusterUpdating } = useClusterContext();

  const {
    reset,
    formState: { isDirty },
  } = useFormContext<ClientClusterContract>();

  const { setCurrentContract, isAdvancedSettingsEnabled } =
    useClusterFormContext();

  useEffect(() => {
    if (cluster.contract) {
      reset(cluster.contract.config);
      setCurrentContract(
        Contract.fromJsonString(atob(cluster.contract.base64_contract), {
          ignoreUnknownFields: true,
        })
      );
    }
  }, [cluster]);

  const tabs = useMemo(() => {
    const tabs = [
      {
        label: "Overview",
        value: "overview" as ValidTab,
      },
      isAdvancedSettingsEnabled && cluster.cloud_provider.name === "AWS"
        ? {
            label: "Advanced",
            value: "advanced" as ValidTab,
          }
        : undefined,
      {
        label: "Settings",
        value: "settings" as ValidTab,
      },
    ].filter(valueExists);

    if (user?.email?.endsWith("@porter.run")) {
      tabs.push({
        label: "System status",
        value: "systemStatus" as ValidTab,
      });
    }

    return tabs;
  }, [isAdvancedSettingsEnabled]);

  const currentTab = useMemo(() => {
    if (tabParam && validTabs.includes(tabParam as ValidTab)) {
      return tabParam as ValidTab;
    }

    return DEFAULT_TAB;
  }, [tabParam]);

  return (
    <DashboardWrapper>
      {isClusterUpdating && (
        <>
          <ClusterProvisioningIndicator />
          <Spacer y={1} />
        </>
      )}
      {cluster.status === "FAILED" && (
        <>
          <Banner
            type="error"
            suffix={
              <>
                <ClusterSaveButton
                  height={"10px"}
                  disabledTooltipPosition={"bottom"}
                  isClusterUpdating={isClusterUpdating}
                >
                  Retry
                </ClusterSaveButton>
              </>
            }
          >
            An error occurred while applying the latest updates to your
            infrastructure.
            <Spacer inline width="5px" />
          </Banner>
          <Spacer y={1} />
        </>
      )}
      <AnimateHeight height={isDirty ? "auto" : 0}>
        <Banner
          type="warning"
          suffix={
            <>
              <ClusterSaveButton
                height={"10px"}
                disabledTooltipPosition={"bottom"}
                isClusterUpdating={isClusterUpdating}
              >
                Update
              </ClusterSaveButton>
            </>
          }
        >
          Changes you are currently previewing have not been saved.
          <Spacer inline width="5px" />
        </Banner>
        <Spacer y={1} />
      </AnimateHeight>
      <TabSelector
        options={tabs}
        currentTab={currentTab}
        setCurrentTab={(tab) => {
          history.push(`/infrastructure/${cluster.id}/${tab}`);
        }}
      />
      <Spacer y={1} />
      {match(currentTab)
        .with("overview", () => <ClusterOverview />)
        .with("settings", () => <Settings />)
        .with("advanced", () => <AdvancedSettingsTab />)
        .with("systemStatus", () => <SystemStatus />)
        .otherwise(() => null)}
    </DashboardWrapper>
  );
};

export default ClusterTabs;

const DashboardWrapper = styled.div`
  width: 100%;
  min-width: 300px;
  height: fit-content;
`;
