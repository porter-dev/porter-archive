import React, { useContext, useState } from "react";
import { withRouter, type RouteComponentProps } from "react-router";
import styled from "styled-components";
import { z } from "zod";

import GCPProvisionerSettings from "components/GCPProvisionerSettings";
import GPUCostConsent from "components/GPUCostConsent";
import Modal from "components/porter/Modal";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import ProvisionerSettings from "components/ProvisionerSettings";

import api from "shared/api";
import { Context } from "shared/Context";
import { type InfraCredentials } from "shared/types";

import AzureProvisionerSettings from "../../../components/AzureProvisionerSettings";
import ClusterRevisionSelector from "../cluster-dashboard/dashboard/ClusterRevisionSelector";
import AWSCredentialsList from "./AddCluster/AWSCredentialList";

type Props = RouteComponentProps & {
  closeModal: () => void;
  gpuModal?: boolean;
  gcp?: boolean;
  azure?: boolean;
};

const ProvisionClusterModal: React.FC<Props> = ({
  closeModal,
  gpuModal,
  gcp,
  azure,
}) => {
  const { currentCluster, currentProject } = useContext(Context);

  const [currentCredential, setCurrentCredential] =
    useState<InfraCredentials>(null);
  const [currentStep, setCurrentStep] = useState("cloud");
  const [targetArn, setTargetARN] = useState("");
  const [selectedClusterVersion, setSelectedClusterVersion] =
    useState<ContractData>();
  const [showProvisionerStatus, setShowProvisionerStatus] = useState(false);
  const [provisionFailureReason, setProvisionFailureReason] = useState("");

  return (
    <Modal closeModal={closeModal} width={"1000px"}>
      {gpuModal ? (
        <>
          <Text size={16}>Add A GPU workload</Text>
          <Spacer y={0.5} />
          <Text color="helper">
            To enable GPU workloads on this service, you need to provision new
            GPU nodes.
          </Text>
        </>
      ) : (
        <Text size={16}>Provision A New Cluster</Text>
      )}
      <Spacer y={1} />

      <ScrollableContent>
        <>
          {gpuModal ? (
            <>
              <ClusterRevisionSelector
                setSelectedClusterVersion={setSelectedClusterVersion}
                setShowProvisionerStatus={setShowProvisionerStatus}
                setProvisionFailureReason={setProvisionFailureReason}
                gpuModal={true}
              />

              {gcp ? (
                <GCPProvisionerSettings
                  clusterId={gpuModal ? currentCluster?.id : null}
                  gpuModal={gpuModal}
                  credentialId={
                    currentCluster.cloud_provider_credential_identifier
                  }
                  selectedClusterVersion={selectedClusterVersion}
                  closeModal={closeModal}
                />
              ) : azure ? (
                <AzureProvisionerSettings
                  clusterId={gpuModal ? currentCluster?.id : undefined}
                  gpuModal={gpuModal}
                  credentialId={
                    currentCluster.cloud_provider_credential_identifier
                  }
                  selectedClusterVersion={selectedClusterVersion}
                  closeModal={closeModal}
                />
              ) : (
                <ProvisionerSettings
                  clusterId={gpuModal ? currentCluster?.id : undefined}
                  gpuModal={gpuModal}
                  credentialId={
                    currentCluster.cloud_provider_credential_identifier
                  }
                  selectedClusterVersion={selectedClusterVersion}
                  closeModal={closeModal}
                />
              )}
            </>
          ) : currentCredential && targetArn ? (
            <>
              <ProvisionerSettings
                credentialId={targetArn}
                closeModal={closeModal}
                clusterId={gpuModal ? currentCluster?.id : null}
              />
            </>
          ) : (
            <AWSCredentialsList
              setTargetARN={setTargetARN}
              selectCredential={(i) => {
                setCurrentCredential({
                  aws_integration_id: i,
                });
              }}
              gpuModal={gpuModal}
            />
          )}
        </>
      </ScrollableContent>
    </Modal>
  );
};

export default withRouter(ProvisionClusterModal);

const ScrollableContent = styled.div`
  width: 100%;
  max-height: 700px; // or whatever height you prefer
  overflow-y: auto;
  padding: 10px;
  position: relative;
`;
