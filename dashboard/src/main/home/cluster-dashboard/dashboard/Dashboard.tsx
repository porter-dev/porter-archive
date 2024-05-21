import React, { useContext, useEffect, useState } from "react";
import { useLocation } from "react-router";
import styled from "styled-components";

import AzureProvisionerSettings from "components/AzureProvisionerSettings";
import GCPProvisionerSettings from "components/GCPProvisionerSettings";
import Button from "components/porter/Button";
import DashboardPlaceholder from "components/porter/DashboardPlaceholder";
import Image from "components/porter/Image";
import PorterLink from "components/porter/Link";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import ProvisionerSettings from "components/ProvisionerSettings";
import TabSelector from "components/TabSelector";

import api from "shared/api";
import useAuth from "shared/auth/useAuth";
import { Context } from "shared/Context";
import { getQueryParam } from "shared/routing";
import editIcon from "assets/edit-button.svg";
import infraGrad from "assets/infra-grad.svg";

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

const tabOptions: Array<{
  label: string;
  value: TabEnum;
}> = [{ label: "Additional settings", value: "settings" }];

export const Dashboard: React.FunctionComponent = () => {
  const [currentTab, setCurrentTab] = useState<TabEnum>("settings");
  const [currentTabOptions, setCurrentTabOptions] = useState(tabOptions);
  const [isAuthorized] = useAuth();
  const location = useLocation();
  const [selectedClusterVersion, setSelectedClusterVersion] = useState(null);
  const [showProvisionerStatus, setShowProvisionerStatus] = useState(false);
  const [provisionFailureReason, setProvisionFailureReason] = useState("");
  const [ingressIp, setIngressIp] = useState("");
  const [ingressError, setIngressError] = useState("");

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
            {context.currentCluster.cloud_provider === "AWS" && (
              <ProvisionerSettings
                selectedClusterVersion={selectedClusterVersion}
                provisionerError={provisionFailureReason}
                clusterId={context.currentCluster.id}
                credentialId={
                  context.currentCluster.cloud_provider_credential_identifier
                }
              />
            )}
            {context.currentCluster.cloud_provider === "Azure" && (
              <AzureProvisionerSettings
                selectedClusterVersion={selectedClusterVersion}
                provisionerError={provisionFailureReason}
                clusterId={context.currentCluster.id}
                credentialId={
                  context.currentCluster.cloud_provider_credential_identifier
                }
              />
            )}
            {context.currentCluster.cloud_provider === "GCP" && (
              <GCPProvisionerSettings
                selectedClusterVersion={selectedClusterVersion}
                provisionerError={provisionFailureReason}
                clusterId={context.currentCluster.id}
                credentialId={
                  context.currentCluster.cloud_provider_credential_identifier
                }
              />
            )}
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

  useEffect(() => {
    updateClusterWithDetailedData();
  }, [context.currentCluster]);

  const renderContents = () => {
    if (context.currentProject?.sandbox_enabled) {
      return (
        <DashboardPlaceholder>
          <Text size={16}>
            Infrastructure settings are not enabled on the Porter Cloud.
          </Text>
          <Spacer y={0.5} />
          <Text color={"helper"}>
            Eject to your own cloud account to enable managed infrastructure.
          </Text>
          <Spacer y={1} />
          <PorterLink to="https://docs.porter.run/other/eject">
            <Button alt height="35px">
              Request ejection
            </Button>
          </PorterLink>
        </DashboardPlaceholder>
      );
    } else if (context.currentProject?.capi_provisioner_enabled) {
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
            setCurrentTab={(value: TabEnum) => {
              setCurrentTab(value);
            }}
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
            setCurrentTab={(value: TabEnum) => {
              setCurrentTab(value);
            }}
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
              <Image size={25} src={infraGrad} />
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
