import React, { useContext, useEffect, useState } from "react";
import styled from "styled-components";
import { useLocation } from "react-router";
import editIcon from "assets/edit-button.svg";

import api from "shared/api";
import { getQueryParam } from "shared/routing";
import useAuth from "shared/auth/useAuth";
import { Context } from "shared/Context";

import ClusterRevisionSelector from "./ClusterRevisionSelector";
import DashboardHeader from "../DashboardHeader";
import TabSelector from "components/TabSelector";
import ProvisionerSettings from "components/ProvisionerSettings";
import ProvisionerStatus from "./ProvisionerStatus";
import NodeList from "./NodeList";
import { NamespaceList } from "./NamespaceList";
import ClusterSettings from "./ClusterSettings";
import Metrics from "./Metrics";
import ClusterSettingsModal from "./ClusterSettingsModal";

import Loading from "components/Loading";
import Spacer from "components/porter/Spacer";

type TabEnum =
  | "nodes"
  | "settings"
  | "namespaces"
  | "metrics"
  | "incidents"
  | "configuration";

var tabOptions: {
  label: string;
  value: TabEnum;
}[] = [{ label: "Additional settings", value: "settings" }];

export const Dashboard: React.FunctionComponent = () => {
  const [currentTab, setCurrentTab] = useState<TabEnum>("settings");
  const [currentTabOptions, setCurrentTabOptions] = useState(tabOptions);
  const [isAuthorized] = useAuth();
  const location = useLocation();
  const [selectedClusterVersion, setSelectedClusterVersion] = useState(null);
  const [showProvisionerStatus, setShowProvisionerStatus] = useState(false);
  const [provisionFailureReason, setProvisionFailureReason] = useState("");
  const [ingressIp, setIngressIp] = useState(null);
  const [ingressError, setIngressError] = useState(null);

  const context = useContext(Context);
  const renderTab = () => {
    switch (currentTab) {
      case "settings":
        return (
          <ClusterSettings
            ingressIp={ingressIp}
            ingressError={ingressError}
            history={undefined}
            location={undefined}
            match={undefined}
          />
        );
      case "metrics":
        return <Metrics />;
      case "namespaces":
        return <NamespaceList />;
      case "configuration":
        return (
          <>
            <Br />
            <ProvisionerSettings
              selectedClusterVersion={selectedClusterVersion}
              provisionerError={provisionFailureReason}
              clusterId={context.currentCluster.id}
              credentialId={
                context.currentCluster.cloud_provider_credential_identifier
              }
            />
          </>
        );
      default:
        return <NodeList />;
    }
  };

  useEffect(() => {
    if (
      context.currentCluster.status !== "UPDATING_UNAVAILABLE" &&
      !tabOptions.find((tab) => tab.value === "nodes")
    ) {  
      if (!context.currentProject?.capi_provisioner_enabled) {
        tabOptions.unshift({ label: "Namespaces", value: "namespaces" });
        tabOptions.unshift({ label: "Metrics", value: "metrics" });
        tabOptions.unshift({ label: "Nodes", value: "nodes" });
      }
      // tabOptions.unshift({ label: "Metrics", value: "metrics" });
      // tabOptions.unshift({ label: "Nodes", value: "nodes" });
    }

    if (
      context.currentProject?.capi_provisioner_enabled &&
      !tabOptions.find((tab) => tab.value === "configuration")
    ) {
      tabOptions.unshift({ value: "configuration", label: "Configuration" });
    }
  }, []);

  useEffect(() => {
    setCurrentTabOptions(
      tabOptions.filter((option) => {
        if (option.value === "settings") {
          return isAuthorized("cluster", "", ["get", "delete"]);
        }
        return true;
      })
    );
  }, [isAuthorized]);

  useEffect(() => {
    const selectedTab = getQueryParam({ location }, "selected_tab");
    if (tabOptions.find((tab) => tab.value === selectedTab)) {
      setCurrentTab(selectedTab as any);
    }
  }, [location]);

  // Need to reset tab to reset views that don't auto-update on cluster switch (esp namespaces + settings)
  useEffect(() => {
    setShowProvisionerStatus(false);
    if (context.currentProject?.capi_provisioner_enabled) {
      setCurrentTab("configuration");
    } else {
      setCurrentTab("nodes");
    }
  }, [context.currentCluster]);

  const updateClusterWithDetailedData = async () => {
    try {
      const res = await api.getCluster(
        "<token>",
        {},
        {
          project_id: context.currentProject.id,
          cluster_id: context.currentCluster.id,
        }
      );
      if (res.data) {
        const { ingress_ip, ingress_error } = res.data;
        setIngressIp(ingress_ip);
        setIngressError(ingress_error);
      }
    } catch (error) {}
  };

  useEffect(() => {
    updateClusterWithDetailedData();
  }, []);

  const renderContents = () => {
    if (context.currentProject?.capi_provisioner_enabled) {
      return (
        <>
          <ClusterRevisionSelector
            selectedClusterVersion={selectedClusterVersion}
            setSelectedClusterVersion={setSelectedClusterVersion}
            setShowProvisionerStatus={setShowProvisionerStatus}
            setProvisionFailureReason={setProvisionFailureReason}
          />
          {showProvisionerStatus &&
            (context.currentCluster.status === "UPDATING" ||
              context.currentCluster.status === "UPDATING_UNAVAILABLE") && (
              <>
                <ProvisionerStatus
                  provisionFailureReason={provisionFailureReason}
                />
                <Spacer y={1} />
              </>
            )}
          <TabSelector
            options={currentTabOptions}
            currentTab={currentTab}
            setCurrentTab={(value: TabEnum) => setCurrentTab(value)}
          />
          {renderTab()}
        </>
      );
    } else {
      return (
        <>
          <TabSelector
            options={currentTabOptions}
            currentTab={currentTab}
            setCurrentTab={(value: TabEnum) => setCurrentTab(value)}
          />
          {renderTab()}
        </>
      );
    }
  };

  return (
    <>
      <DashboardHeader
        title={
          <Flex>
            <Flex>
              <svg
                width="23"
                height="23"
                viewBox="0 0 19 19"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M15.207 12.4403C16.8094 12.4403 18.1092 11.1414 18.1092 9.53907C18.1092 7.93673 16.8094 6.63782 15.207 6.63782"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M3.90217 12.4403C2.29983 12.4403 1 11.1414 1 9.53907C1 7.93673 2.29983 6.63782 3.90217 6.63782"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  stroke-linejoin="round"
                />
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M9.54993 13.4133C7.4086 13.4133 5.69168 11.6964 5.69168 9.55417C5.69168 7.41284 7.4086 5.69592 9.54993 5.69592C11.6913 5.69592 13.4082 7.41284 13.4082 9.55417C13.4082 11.6964 11.6913 13.4133 9.54993 13.4133Z"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M6.66895 15.207C6.66895 16.8094 7.96787 18.1092 9.5702 18.1092C11.1725 18.1092 12.4715 16.8094 12.4715 15.207"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M6.66895 3.90217C6.66895 2.29983 7.96787 1 9.5702 1C11.1725 1 12.4715 2.29983 12.4715 3.90217"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M5.69591 9.54996C5.69591 7.40863 7.41283 5.69171 9.55508 5.69171C11.6964 5.69171 13.4133 7.40863 13.4133 9.54996C13.4133 11.6913 11.6964 13.4082 9.55508 13.4082C7.41283 13.4082 5.69591 11.6913 5.69591 9.54996Z"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <Spacer inline />
              {context.currentCluster.vanity_name ||
                context.currentCluster.name}
              <Spacer inline />
            </Flex>
            <EditIconStyle
              onClick={() => {
                context.setCurrentModal(<ClusterSettingsModal />);
              }}
            >
              <img src={editIcon} />
            </EditIconStyle>
          </Flex>
        }
        description={`Cluster settings and status for ${
          context.currentCluster.vanity_name || context.currentCluster.name
        }.`}
        disableLineBreak
        capitalize={false}
      />

      {renderContents()}
    </>
  );
};

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
