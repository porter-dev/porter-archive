import React, { useContext, useState } from "react";
import { withRouter, type RouteComponentProps } from "react-router";
import styled from "styled-components";
import api from "shared/api";

import Modal from "components/porter/Modal";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import ProvisionerSettings from "components/ProvisionerSettings";
import GPUCostConsent from "components/GPUCostConsent";
import { Context } from "shared/Context";
import ClusterRevisionSelector from "../cluster-dashboard/dashboard/ClusterRevisionSelector";

import AWSCredentialsList from "./AddCluster/AWSCredentialList";
import { InfraCredentials } from "shared/types";
import { z } from "zod";

type Props = RouteComponentProps & {
  closeModal: () => void;
  gpuModal?: boolean;
}

type EncodedContract = {
  ID: number;
  CreatedAt: string;
  UpdatedAt: string;
  DeletedAt: string | null;
  id: string;
  base64_contract: string;
  cluster_id: number;
  project_id: number;
  condition: string;
  condition_metadata: Record<string, unknown>;
};

type NodeGroup = {
  instanceType: string;
  minInstances: number;
  maxInstances: number;
  nodeGroupType: string;
  isStateful?: boolean;
};

type EksKind = {
  clusterName: string;
  clusterVersion: string;
  cidrRange: string;
  region: string;
  nodeGroups: NodeGroup[];
  loadBalancer: {
    loadBalancerType: string;
  };
  logging: Record<string, unknown>;
  network: {
    vpcCidr: string;
    serviceCidr: string;
  };
};

type Cluster = {
  projectId: number;
  clusterId: number;
  kind: string;
  cloudProvider: string;
  cloudProviderCredentialsId: string;
  eksKind: EksKind;
};

type ContractData = {
  cluster: Cluster;
  user: {
    id: number;
  };
};

const ProvisionClusterModal: React.FC<Props> = ({
  closeModal,
  gpuModal
}) => {
  const {
    currentCluster,
    currentProject
  } = useContext(Context);

  const [currentCredential, setCurrentCredential] = useState<InfraCredentials>(
    null
  );
  const [currentStep, setCurrentStep] = useState("cloud");
  const [targetArn, setTargetARN] = useState("")
  const [selectedClusterVersion, setSelectedClusterVersion] = useState<ContractData>();
  const [showProvisionerStatus, setShowProvisionerStatus] = useState(false);
  const [provisionFailureReason, setProvisionFailureReason] = useState("");


  return (
    <Modal closeModal={closeModal} width={"1000px"}>
      {gpuModal ? <Text size={16}>
        Add A GPU workload
      </Text> : <Text size={16}>
        Provision A New Cluster
      </Text>}
      <Spacer y={1} />


      <ScrollableContent>
        {currentStep === "cloud" && gpuModal ? (
          <GPUCostConsent
            setCurrentStep={setCurrentStep}
            markCostConsentComplete={() => {
              () => { setCurrentStep("credentials"); }
            }}
          />
        ) :
          gpuModal ? (
            <>
              <ClusterRevisionSelector
                selectedClusterVersion={selectedClusterVersion}
                setSelectedClusterVersion={setSelectedClusterVersion}
                setShowProvisionerStatus={setShowProvisionerStatus}
                setProvisionFailureReason={setProvisionFailureReason}
                gpuModal={true}
              />

              <ProvisionerSettings
                clusterId={gpuModal ? currentCluster?.id : null}
                gpuModal={gpuModal}
                credentialId={currentCluster.cloud_provider_credential_identifier}
                selectedClusterVersion={selectedClusterVersion}
              />
            </>
          ) :
            (
              currentCredential && targetArn ? (
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
                  selectCredential={
                    (i) => {
                      setCurrentCredential({
                        aws_integration_id: i,
                      });
                    }
                  }
                  gpuModal={gpuModal}
                />
              )
            )}
      </ScrollableContent>


    </Modal >
  )
}

export default withRouter(ProvisionClusterModal);

const ScrollableContent = styled.div`
  width: 100%;
  max-height: 700px; // or whatever height you prefer
  overflow-y: auto;
  padding: 10px;
  position: relative;
`;
