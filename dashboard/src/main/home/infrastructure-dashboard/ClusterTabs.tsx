import React, { useContext, useMemo, useState } from "react";
import { useHistory, useLocation } from "react-router";
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
import { useClusterContext } from "./ClusterContextProvider";

const validTabs = ["configuration", "settings"] as const;
const DEFAULT_TAB = "configuration" as const;
type ValidTab = (typeof validTabs)[number];

type Props = {
  tabParam?: string;
};
const ClusterTabs: React.FC<Props> = ({ tabParam }) => {
  const history = useHistory();
  const [selectedClusterVersion, setSelectedClusterVersion] = useState(null);
  const [showProvisionerStatus, setShowProvisionerStatus] = useState(false);
  const [provisionFailureReason, setProvisionFailureReason] = useState("");
  const [ingressIp, setIngressIp] = useState("");
  const [ingressError, setIngressError] = useState("");
  const { cluster } = useClusterContext();

  const currentTab = useMemo(() => {
    if (tabParam && validTabs.includes(tabParam as ValidTab)) {
      return tabParam as ValidTab;
    }

    return DEFAULT_TAB;
  }, [tabParam]);
  const tabs = useMemo(() => {
    return [
      { label: "Configuration", value: "configuration" },
      { label: "Settings", value: "settings" },
    ];
  }, []);

  return (
    <DashboardWrapper>
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
      <TabSelector
        options={tabs}
        currentTab={currentTab}
        setCurrentTab={(tab) => {
          history.push(`/infrastructure/${cluster.id}/${tab}`);
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
              {match(cluster.cloud_provider.name)
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

export default ClusterTabs;

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
