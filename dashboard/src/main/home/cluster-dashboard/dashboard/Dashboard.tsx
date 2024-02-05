import React, { useContext, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router";
import styled from "styled-components";
import { match } from "ts-pattern";

import AzureProvisionerSettings from "components/AzureProvisionerSettings";
import GCPProvisionerSettings from "components/GCPProvisionerSettings";
import Loading from "components/Loading";
import Fieldset from "components/porter/Fieldset";
import Icon from "components/porter/Icon";
import ShowIntercomButton from "components/porter/ShowIntercomButton";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import ProvisionerSettings from "components/ProvisionerSettings";
import TabSelector from "components/TabSelector";
import { useCluster } from "lib/hooks/useCluster";

import api from "shared/api";
import useAuth from "shared/auth/useAuth";
import { Context } from "shared/Context";
import { getQueryParam } from "shared/routing";
import { valueExists } from "shared/util";
import infra from "assets/cluster.svg";
import editIcon from "assets/edit-button.svg";

import DashboardHeader from "../DashboardHeader";
import ClusterRevisionSelector from "./ClusterRevisionSelector";
import ClusterSettings from "./ClusterSettings";
import ClusterSettingsModal from "./ClusterSettingsModal";
import Metrics from "./Metrics";
import { NamespaceList } from "./NamespaceList";
import NodeList from "./NodeList";
import ProvisionerStatus from "./ProvisionerStatus";

type TabEnum =
  | "nodes"
  | "settings"
  | "namespaces"
  | "metrics"
  | "incidents"
  | "configuration";

const Dashboard: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<TabEnum>("settings");
  const [isAuthorized] = useAuth();
  const location = useLocation();
  const [selectedClusterVersion, setSelectedClusterVersion] = useState(null);
  const [showProvisionerStatus, setShowProvisionerStatus] = useState(false);
  const [provisionFailureReason, setProvisionFailureReason] = useState("");
  const [ingressIp, setIngressIp] = useState("");
  const [ingressError, setIngressError] = useState("");

  const { cluster, isLoading } = useCluster();
  const { setCurrentModal, currentProject } = useContext(Context);

  const tabOptions: Array<{ label: string; value: TabEnum }> = useMemo(() => {
    return [
      !currentProject?.capi_provisioner_enabled
        ? {
            label: "Nodes",
            value: "nodes" as const,
          }
        : undefined,
      !currentProject?.capi_provisioner_enabled
        ? {
            label: "Namespaces",
            value: "namespaces" as const,
          }
        : undefined,
      !currentProject?.capi_provisioner_enabled
        ? {
            label: "Metrics",
            value: "metrics" as const,
          }
        : undefined,
      currentProject?.capi_provisioner_enabled
        ? {
            label: "Configuration",
            value: "configuration" as const,
          }
        : undefined,
      isAuthorized("cluster", "", ["get", "delete"])
        ? {
            label: "Additional settings",
            value: "settings" as const,
          }
        : undefined,
    ].filter(valueExists);
  }, [currentProject, isAuthorized]);
  // const renderTab = () => {
  //   switch (currentTab) {
  //     case "settings":
  //       return (
  //         <ClusterSettings
  //           ingressIp={ingressIp}
  //           ingressError={ingressError}
  //           history={undefined}
  //           location={undefined}
  //           match={undefined}
  //         />
  //       );
  //     case "metrics":
  //       return <Metrics />;
  //     case "namespaces":
  //       return <NamespaceList />;
  //     case "configuration":
  //       return (
  //         <>
  //           <Br />
  //           {currentCluster.cloud_provider === "AWS" && (
  //             <ProvisionerSettings
  //               selectedClusterVersion={selectedClusterVersion}
  //               provisionerError={provisionFailureReason}
  //               clusterId={currentCluster.id}
  //               credentialId={
  //                 currentCluster.cloud_provider_credential_identifier
  //               }
  //             />
  //           )}
  //           {currentCluster.cloud_provider === "Azure" && (
  //             <AzureProvisionerSettings
  //               selectedClusterVersion={selectedClusterVersion}
  //               provisionerError={provisionFailureReason}
  //               clusterId={currentCluster.id}
  //               credentialId={
  //                 currentCluster.cloud_provider_credential_identifier
  //               }
  //             />
  //           )}
  //           {currentCluster.cloud_provider === "GCP" && (
  //             <GCPProvisionerSettings
  //               selectedClusterVersion={selectedClusterVersion}
  //               provisionerError={provisionFailureReason}
  //               clusterId={currentCluster.id}
  //               credentialId={
  //                 currentCluster.cloud_provider_credential_identifier
  //               }
  //             />
  //           )}
  //         </>
  //       );
  //     default:
  //       return <NodeList />;
  //   }
  // };

  // useEffect(() => {
  //   if (
  //     currentCluster.status !== "UPDATING_UNAVAILABLE" &&
  //     !tabOptions.find((tab) => tab.value === "nodes")
  //   ) {
  //     if (!currentProject?.capi_provisioner_enabled) {
  //       tabOptions.unshift({ label: "Namespaces", value: "namespaces" });
  //       tabOptions.unshift({ label: "Metrics", value: "metrics" });
  //       tabOptions.unshift({ label: "Nodes", value: "nodes" });
  //     }
  //   }

  //   if (
  //     currentProject?.capi_provisioner_enabled &&
  //     !tabOptions.find((tab) => tab.value === "configuration")
  //   ) {
  //     tabOptions.unshift({ value: "configuration", label: "Configuration" });
  //   }
  // }, []);

  // useEffect(() => {
  //   const selectedTab = getQueryParam({ location }, "selected_tab");
  //   if (tabOptions.find((tab) => tab.value === selectedTab)) {
  //     setCurrentTab(selectedTab as any);
  //   }
  // }, [location]);

  // // Need to reset tab to reset views that don't auto-update on cluster switch (esp namespaces + settings)
  // useEffect(() => {
  //   setShowProvisionerStatus(false);
  //   if (currentProject?.capi_provisioner_enabled) {
  //     setCurrentTab("configuration");
  //   } else {
  //     setCurrentTab("nodes");
  //   }
  // }, [currentCluster]);

  if (isLoading) {
    return (
      <div
        style={{
          height: "80vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <Loading />
      </div>
    );
  }

  if (!cluster) {
    return (
      <Fieldset>
        <Text>Cluster not found</Text>
        <Spacer y={1} />
        <ShowIntercomButton message={"I need help loading Infrastructure."} />
      </Fieldset>
    );
  }

  const clusterName = useMemo(() => {
    return cluster.vanity_name || cluster.name;
  }, [cluster]);

  return (
    <>
      <DashboardHeader
        title={
          <Flex>
            <Flex>
              <Icon src={infra} />
              <Spacer inline />
              {clusterName}
              <Spacer inline />
            </Flex>
            <EditIconStyle
              onClick={() => {
                setCurrentModal?.(<ClusterSettingsModal />);
              }}
            >
              <img src={editIcon} />
            </EditIconStyle>
          </Flex>
        }
        description={"Cluster settings and status."}
        disableLineBreak
        capitalize={false}
      />

      {currentProject?.capi_provisioner_enabled && (
        <>
          <ClusterRevisionSelector
            setSelectedClusterVersion={setSelectedClusterVersion}
            setShowProvisionerStatus={setShowProvisionerStatus}
            setProvisionFailureReason={setProvisionFailureReason}
          />
          {showProvisionerStatus &&
            (cluster.status === "UPDATING" ||
              cluster.status === "UPDATING_UNAVAILABLE") && (
              <>
                <ProvisionerStatus
                  provisionFailureReason={provisionFailureReason}
                />
                <Spacer y={1} />
              </>
            )}
        </>
      )}
      <TabSelector
        options={tabOptions}
        currentTab={currentTab}
        setCurrentTab={(value: TabEnum) => {
          setCurrentTab(value);
        }}
      />
      {match(currentTab)
        .with("settings", () => (
          <ClusterSettings
            ingressIp={ingressIp}
            ingressError={ingressError}
            history={undefined}
            location={undefined}
            match={undefined}
          />
        ))
        .with("metrics", () => <Metrics />)
        .with("namespaces", () => <NamespaceList />)
        .with("configuration", () => {
          return (
            <>
              <Br />
              {match(cluster.cloud_provider)
                .with("AWS", () => (
                  <ProvisionerSettings
                    selectedClusterVersion={selectedClusterVersion}
                    provisionerError={provisionFailureReason}
                    clusterId={cluster.id}
                    credentialId={cluster.cloud_provider_credential_identifier}
                  />
                ))
                .with("Azure", () => (
                  <AzureProvisionerSettings
                    selectedClusterVersion={selectedClusterVersion}
                    provisionerError={provisionFailureReason}
                    clusterId={cluster.id}
                    credentialId={cluster.cloud_provider_credential_identifier}
                  />
                ))
                .with("GCP", () => (
                  <GCPProvisionerSettings
                    selectedClusterVersion={selectedClusterVersion}
                    provisionerError={provisionFailureReason}
                    clusterId={cluster.id}
                    credentialId={cluster.cloud_provider_credential_identifier}
                  />
                ))
                .exhaustive()}
            </>
          );
        })
        .otherwise(() => null)}
    </>
  );
};

export default Dashboard;

const EditIconStyle = styled.div`
  width: 20px;
  height: 20px;
  margin-left: -5px;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 40px;
  margin-bottom: 3px;
  :hover {
    background: #ffffff18;
  }
  > img {
    width: 22px;
    opacity: 0.4;
    margin-bottom: -4px;
  }
`;

const Flex = styled.div`
  display: flex;
  align-items: center;
`;

const Br = styled.div`
  width: 100%;
  height: 35px;
`;
