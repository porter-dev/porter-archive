import React, { useEffect, useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import AnimateHeight from "react-animate-height";
import { FormProvider, useForm } from "react-hook-form";
import { useHistory } from "react-router";
import styled from "styled-components";
import { match } from "ts-pattern";
import { z } from "zod";

import Banner from "components/porter/Banner";
import { Error as ErrorComponent } from "components/porter/Error";
import Spacer from "components/porter/Spacer";
import TabSelector from "components/TabSelector";
import {
  clusterContractValidator,
  type ClientClusterContract,
} from "lib/clusters/types";
import { useIntercom } from "lib/hooks/useIntercom";

import { useClusterContext } from "./ClusterContextProvider";
import ClusterProvisioningIndicator from "./ClusterProvisioningIndicator";
import ClusterSaveButton from "./ClusterSaveButton";
import ClusterOverview from "./tabs/overview/ClusterOverview";
import Settings from "./tabs/Settings";

const validTabs = ["overview", "settings"] as const;
const DEFAULT_TAB = "overview" as const;
type ValidTab = (typeof validTabs)[number];
const tabs = [
  { label: "Overview", value: "overview" },
  { label: "Settings", value: "settings" },
];
// todo(ianedwards): refactor button to use more predictable state
export type ButtonStatus = "" | "loading" | JSX.Element | "success";

type Props = {
  tabParam?: string;
};
const ClusterTabs: React.FC<Props> = ({ tabParam }) => {
  const history = useHistory();

  const { cluster, updateCluster } = useClusterContext();

  const { showIntercomWithMessage } = useIntercom();

  const clusterForm = useForm<ClientClusterContract>({
    reValidateMode: "onSubmit",
    resolver: zodResolver(clusterContractValidator),
    defaultValues: cluster.contract.config,
  });
  const {
    handleSubmit,
    formState: { isDirty, isSubmitting, isSubmitSuccessful, errors },
    setError,
    reset,
  } = clusterForm;

  useEffect(() => {
    reset(cluster.contract.config);
  }, [cluster]);

  const currentTab = useMemo(() => {
    if (tabParam && validTabs.includes(tabParam as ValidTab)) {
      return tabParam as ValidTab;
    }

    return DEFAULT_TAB;
  }, [tabParam]);

  const isClusterUpdating = useMemo(() => {
    return cluster.contract.condition === "";
  }, [cluster.contract.condition]);

  const buttonStatus = useMemo(() => {
    if (isSubmitting) {
      return "loading";
    }
    const errorKeys = Object.keys(errors);
    if (errorKeys.length > 0) {
      let errorMessage =
        "Cluster update failed. Please try again. If the error persists, please contact support@porter.run.";
      if (errorKeys.includes("cluster")) {
        errorMessage = errors.cluster?.message ?? errorMessage;
      }
      return <ErrorComponent message={errorMessage} maxWidth="600px" />;
    }

    if (isSubmitSuccessful) {
      return "success";
    }

    return "";
  }, [isSubmitting, JSON.stringify(errors), isSubmitSuccessful]);

  const onSubmit = handleSubmit(async (data) => {
    try {
      await updateCluster(data);
    } catch (err) {
      showIntercomWithMessage({
        message: "I am running into an issue updating my cluster.",
      });

      let message =
        "Cluster update failed: please try again or contact support@porter.run if the error persists.";

      if (axios.isAxiosError(err)) {
        const parsed = z
          .object({ error: z.string() })
          .safeParse(err.response?.data);
        if (parsed.success) {
          message = `Cluster update failed: ${parsed.data.error}`;
        }
      }
      setError("cluster", {
        message,
      });
    }
  });

  return (
    <FormProvider {...clusterForm}>
      <form onSubmit={onSubmit}>
        <DashboardWrapper>
          {isClusterUpdating && (
            <>
              <ClusterProvisioningIndicator />
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
                    status={buttonStatus}
                    isDisabled={isSubmitting || isClusterUpdating}
                    disabledTooltipPosition={"bottom"}
                  />
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
            .with("overview", () => (
              <ClusterOverview
                updateButtonStatus={buttonStatus}
                isUpdateDisabled={isSubmitting || isClusterUpdating}
              />
            ))
            .with("settings", () => <Settings />)
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
