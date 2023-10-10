import { RouteComponentProps, withRouter } from "react-router";
import styled, { css } from "styled-components";
import React, { useContext, useEffect, useState } from "react";
import Loading from "components/Loading";

import Modal from "components/porter/Modal";
import Text from "components/porter/Text";
import AWSCredentialsList from "./AddCluster/AWSCredentialList";
import { InfraCredentials } from "shared/types";
import ProvisionerSettings from "components/ProvisionerSettings";
import Spacer from "components/porter/Spacer";
import ProvisionerForm from "components/ProvisionerForm";


type Props = RouteComponentProps & {
    closeModal: () => void;

}

const ProvisionClusterModal: React.FC<Props> = ({
    closeModal,

}) => {
    const [currentCredential, setCurrentCredential] = useState<InfraCredentials>(
        null
    );
    const [currentStep, setCurrentStep] = useState("cloud");
    const [targetArn, setTargetARN] = useState("")

    return (
        <Modal closeModal={closeModal} width={"1000px"}>
            <Text size={16}>
                Provision A New Cluster
            </Text>
            <Spacer y={1} />
            <ScrollableContent>
                {currentCredential && targetArn ? (
                    <>
                        <ProvisionerSettings
                            credentialId={targetArn}
                            closeModal={closeModal}
                        />
                        {/* Uncommented for future use if needed.
                    <ProvisionerForm
                        goBack={() => setCurrentStep("credentials")}
                        credentialId={String(currentCredential.aws_integration_id)}
                        provider={"aws"}
                    /> */}
                    </>
                ) : (
                    <AWSCredentialsList
                        setTargetARN={setTargetARN}
                        selectCredential={
                            (i) => setCurrentCredential({
                                aws_integration_id: i,
                            })
                        }
                    />
                )}
            </ScrollableContent>
        </Modal >
    )
}

export default ProvisionClusterModal;

const ScrollableContent = styled.div`
    width: 100%;
    max-height: 700px;  // or whatever height you prefer
    overflow-y: auto;
    padding: 10px;
    position: relative;
`;