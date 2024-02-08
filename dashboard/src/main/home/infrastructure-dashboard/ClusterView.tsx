import React, { useContext, useMemo, useState } from "react";
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

import useAuth from "shared/auth/useAuth";
import { Context } from "shared/Context";
import { valueExists } from "shared/util";
import infra from "assets/cluster.svg";
import editIcon from "assets/edit-button.svg";

import ClusterRevisionSelector from "../cluster-dashboard/dashboard/ClusterRevisionSelector";
import ClusterSettings from "../cluster-dashboard/dashboard/ClusterSettings";
import ClusterSettingsModal from "../cluster-dashboard/dashboard/ClusterSettingsModal";
import ProvisionerStatus from "../cluster-dashboard/dashboard/ProvisionerStatus";
import DashboardHeader from "../cluster-dashboard/DashboardHeader";

type TabEnum =
  | "nodes"
  | "settings"
  | "namespaces"
  | "metrics"
  | "incidents"
  | "configuration";

const InfrastructureDashboard: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<TabEnum>("configuration");
  const [isAuthorized] = useAuth();
  const location = useLocation();
  const [selectedClusterVersion, setSelectedClusterVersion] = useState(null);
  const [showProvisionerStatus, setShowProvisionerStatus] = useState(false);
  const [provisionFailureReason, setProvisionFailureReason] = useState("");
  const [ingressIp, setIngressIp] = useState("");
  const [ingressError, setIngressError] = useState("");

  const { cluster, isLoading } = useCluster();
  const { setCurrentModal, currentProject } = useContext(Context);

  const clusterName = useMemo(() => {
    return cluster?.vanity_name || cluster?.name;
  }, [cluster]);

  const tabOptions: Array<{ label: string; value: TabEnum }> = useMemo(() => {
    return [
      {
        label: "Configuration",
        value: "configuration" as const,
      },
      isAuthorized("cluster", "", ["get", "delete"])
        ? {
            label: "Additional settings",
            value: "settings" as const,
          }
        : undefined,
    ].filter(valueExists);
  }, [currentProject, isAuthorized]);

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

  return (
    <DashboardWrapper>
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
    </DashboardWrapper>
  );
};

export default InfrastructureDashboard;

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

const DashboardWrapper = styled.div`
  width: 100%;
  min-width: 300px;
  height: fit-content;
`;
