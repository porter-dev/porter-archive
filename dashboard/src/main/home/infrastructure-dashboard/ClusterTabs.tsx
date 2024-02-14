import React, { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Contract } from "@porter-dev/api-contracts";
import AnimateHeight from "react-animate-height";
import { FormProvider, useForm } from "react-hook-form";
import { useHistory } from "react-router";
import styled from "styled-components";
import { match } from "ts-pattern";

import Banner from "components/porter/Banner";
import { Error as ErrorComponent } from "components/porter/Error";
import Spacer from "components/porter/Spacer";
import TabSelector from "components/TabSelector";
import {
  clusterContractValidator,
  type ClientClusterContract,
  type UpdateClusterResponse,
} from "lib/clusters/types";
import { useUpdateCluster } from "lib/hooks/useCluster";
import { useIntercom } from "lib/hooks/useIntercom";

import { useClusterContext } from "./ClusterContextProvider";
import ClusterProvisioningIndicator from "./ClusterProvisioningIndicator";
import ClusterSaveButton from "./ClusterSaveButton";
import { type UpdateClusterButtonProps } from "./forms/CreateClusterForm";
import PreflightChecksModal from "./modals/PreflightChecksModal";
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
  const [updateClusterResponse, setUpdateClusterResponse] = useState<
    | {
        response: UpdateClusterResponse;
        error?: string;
      }
    | {
        response?: UpdateClusterResponse;
        error: string;
      }
    | undefined
  >(undefined);
  const [showFailedPreflightChecksModal, setShowFailedPreflightChecksModal] =
    useState<boolean>(false);
  const { cluster, projectId } = useClusterContext();
  const { updateCluster, isHandlingPreflightChecks, isCreatingContract } =
    useUpdateCluster({ projectId });

  const { showIntercomWithMessage } = useIntercom();

  const clusterForm = useForm<ClientClusterContract>({
    reValidateMode: "onSubmit",
    resolver: zodResolver(clusterContractValidator),
    defaultValues: cluster.contract.config,
  });
  const {
    handleSubmit,
    formState: { isDirty, isSubmitting },
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

  const updateClusterButtonProps = useMemo(() => {
    const props: UpdateClusterButtonProps = {
      status: "",
      isDisabled: false,
      loadingText: "",
    };
    if (isSubmitting) {
      props.status = "loading";
      props.isDisabled = true;
    }
    if (updateClusterResponse?.error) {
      props.status = (
        <ErrorComponent
          message={updateClusterResponse?.error}
          maxWidth="600px"
        />
      );
    }
    if (isHandlingPreflightChecks) {
      props.loadingText = "Running preflight checks...";
    }
    if (isCreatingContract) {
      props.loadingText = "Creating cluster...";
    }
    if (updateClusterResponse?.response?.createContractResponse) {
      props.status = "success";
    }

    return props;
  }, [
    isSubmitting,
    updateClusterResponse,
    isHandlingPreflightChecks,
    isCreatingContract,
  ]);

  const onSubmit = handleSubmit(async (data) => {
    setUpdateClusterResponse(undefined);
    const latestContract = Contract.fromJsonString(
      atob(cluster.contract.base64_contract),
      {
        ignoreUnknownFields: true,
      }
    );
    if (!latestContract.cluster) {
      return;
    }

    const response = await updateCluster(data, latestContract);
    setUpdateClusterResponse(response);
    if (response.response?.preflightChecks) {
      setShowFailedPreflightChecksModal(true);
    }
    if (response.error) {
      showIntercomWithMessage({
        message: "I am running into an issue updating my cluster.",
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
                    status={updateClusterButtonProps.status}
                    isDisabled={isSubmitting || isClusterUpdating}
                    loadingText={updateClusterButtonProps.loadingText}
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
                updateClusterButtonProps={updateClusterButtonProps}
              />
            ))
            .with("settings", () => <Settings />)
            .otherwise(() => null)}
        </DashboardWrapper>
        {showFailedPreflightChecksModal &&
          updateClusterResponse?.response?.preflightChecks && (
            <PreflightChecksModal
              onClose={() => {
                setShowFailedPreflightChecksModal(false);
              }}
              preflightChecks={updateClusterResponse?.response?.preflightChecks}
            />
          )}
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
