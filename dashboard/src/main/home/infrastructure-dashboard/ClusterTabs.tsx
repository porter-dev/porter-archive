import React, { useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";
import { useHistory } from "react-router";
import styled from "styled-components";
import { match } from "ts-pattern";

import Spacer from "components/porter/Spacer";
import TabSelector from "components/TabSelector";
import {
  contractClusterValidator,
  type ClientClusterContract,
} from "lib/clusters/types";

import { useClusterContext } from "./ClusterContextProvider";
import ClusterProvisioningIndicator from "./ClusterProvisioningIndicator";
import ClusterOverview from "./tabs/overview/ClusterOverview";
import Settings from "./tabs/Settings";

const validTabs = ["overview", "settings"] as const;
const DEFAULT_TAB = "overview" as const;
type ValidTab = (typeof validTabs)[number];
const tabs = [
  { label: "Overview", value: "overview" },
  { label: "Settings", value: "settings" },
];

type Props = {
  tabParam?: string;
};
const ClusterTabs: React.FC<Props> = ({ tabParam }) => {
  const history = useHistory();

  const { cluster, updateCluster } = useClusterContext();

  const clusterForm = useForm<ClientClusterContract>({
    reValidateMode: "onSubmit",
    resolver: zodResolver(contractClusterValidator),
    defaultValues: cluster.contract.config,
  });

  const currentTab = useMemo(() => {
    if (tabParam && validTabs.includes(tabParam as ValidTab)) {
      return tabParam as ValidTab;
    }

    return DEFAULT_TAB;
  }, [tabParam]);

  const onSubmit = clusterForm.handleSubmit(async (data) => {
    try {
      updateCluster(data);
    } catch (err) {
      // console.log(err);
    }
  });

  return (
    <FormProvider {...clusterForm}>
      <form onSubmit={onSubmit}>
        <DashboardWrapper>
          {cluster.contract.condition === "" && (
            <>
              <ClusterProvisioningIndicator />
              <Spacer y={1} />
            </>
          )}
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
      </form>
    </FormProvider>
  );
};

export default ClusterTabs;

const DashboardWrapper = styled.div`
  width: 100%;
  min-width: 300px;
  height: fit-content;
`;
