import React, { useMemo } from "react";
import { useHistory } from "react-router";
import styled from "styled-components";
import { match } from "ts-pattern";

import AzureProvisionerSettings from "components/AzureProvisionerSettings";
import GCPProvisionerSettings from "components/GCPProvisionerSettings";
import Spacer from "components/porter/Spacer";
import ProvisionerSettings from "components/ProvisionerSettings";
import TabSelector from "components/TabSelector";

import ClusterRevisionSelector from "../cluster-dashboard/dashboard/ClusterRevisionSelector";
import ClusterSettings from "../cluster-dashboard/dashboard/ClusterSettings";
import ProvisionerStatus from "../cluster-dashboard/dashboard/ProvisionerStatus";
import { useClusterContext } from "./ClusterContextProvider";
import ClusterProvisioningIndicator from "./ClusterProvisioningIndicator";
import ClusterOverview from "./tabs/overview/ClusterOverview";
import Settings from "./tabs/Settings";

const validTabs = ["overview", "settings"] as const;
const DEFAULT_TAB = "overview" as const;
type ValidTab = (typeof validTabs)[number];

type Props = {
  tabParam?: string;
};
const ClusterTabs: React.FC<Props> = ({ tabParam }) => {
  const history = useHistory();

  const { cluster } = useClusterContext();

  const currentTab = useMemo(() => {
    if (tabParam && validTabs.includes(tabParam as ValidTab)) {
      return tabParam as ValidTab;
    }

    return DEFAULT_TAB;
  }, [tabParam]);
  const tabs = useMemo(() => {
    return [
      { label: "Overview", value: "overview" },
      { label: "Settings", value: "settings" },
    ];
  }, []);

  return (
    <DashboardWrapper>
      {/* <ClusterRevisionSelector
        setSelectedClusterVersion={setSelectedClusterVersion}
        setShowProvisionerStatus={setShowProvisionerStatus}
        setProvisionFailureReason={setProvisionFailureReason}
      /> */}
      {/* {showProvisionerStatus &&
        (cluster.status === "UPDATING" ||
          cluster.status === "UPDATING_UNAVAILABLE") && (
          <>
            <ProvisionerStatus
              provisionFailureReason={provisionFailureReason}
            />
            <Spacer y={1} />
          </>
        )} */}
      {cluster.contract.condition === "" && <ClusterProvisioningIndicator />}
      <TabSelector
        options={tabs}
        currentTab={currentTab}
        setCurrentTab={(tab) => {
          history.push(`/infrastructure/${cluster.id}/${tab}`);
        }}
      />
      <Spacer y={1} />
      {match(currentTab)
        .with("settings", () => <Settings />)
        .with("overview", () => <ClusterOverview />)

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
