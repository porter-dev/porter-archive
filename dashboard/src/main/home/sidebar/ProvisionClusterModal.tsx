import React, { useState } from "react";
import { withRouter, type RouteComponentProps } from "react-router";
import styled from "styled-components";

import Modal from "components/porter/Modal";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import ProvisionerSettings from "components/ProvisionerSettings";

import { type InfraCredentials } from "shared/types";

import AWSCredentialsList from "./AddCluster/AWSCredentialList";

type Props = RouteComponentProps & {
  closeModal: () => void;
};

const ProvisionClusterModal: React.FC<Props> = ({ closeModal }) => {
  const [currentCredential, setCurrentCredential] =
    useState<InfraCredentials | null>(null);
  const [targetArn, setTargetARN] = useState("");

  return (
    <Modal closeModal={closeModal} width={"1000px"}>
      <Text size={16}>Provision A New Cluster</Text>
      <Spacer y={1} />
      <ScrollableContent>
        {currentCredential && targetArn ? (
          <>
            <ProvisionerSettings
              credentialId={targetArn}
              closeModal={closeModal}
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
          />
        )}
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
