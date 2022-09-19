import InputRow from "components/form-components/InputRow";
import SaveButton from "components/SaveButton";
import React, { useContext } from "react";
import { contextType } from "react-modal";
import { Context } from "shared/Context";
import styled from "styled-components";

/**
 * If user goes to /onboarding and has clusters, the Onboarding component
 * will open this modal to let user skip onboarding and keep using porter.
 */
const SkipOnboardingModal = () => {
  const { currentModalData, setHasFinishedOnboarding, setCurrentModal } = useContext(Context);

  return (
    <>
      <Subtitle>
        Porter has detected an existing Kubernetes cluster that was connected
        via the CLI. For custom setups, you can skip the project setup flow.
      </Subtitle>
      <Subtitle>Do you want to skip project setup?</Subtitle>
      <ActionsWrapper>
        <ActionButton
          text="Yes, skip setup"
          color="#616FEEcc"
          onClick={() => {
            if (typeof currentModalData?.skipOnboarding === "function") {
              currentModalData.skipOnboarding();
            }
            setHasFinishedOnboarding(true);
            setCurrentModal(null);
          }}
          status={""}
          clearPosition
        />
      </ActionsWrapper>
    </>
  );
};

export default SkipOnboardingModal;

const ActionButton = styled(SaveButton)``;

const ActionsWrapper = styled.div`
  position: absolute;
  bottom: 14px;
  right: 14px;
  display: flex;
  ${ActionButton} {
    margin-left: 5px;
  }
`;

const Subtitle = styled.div`
  margin-top: 23px;
  font-family: "Work Sans", sans-serif;
  font-size: 14px;
  color: #aaaabb;
  overflow: hidden;
  margin-bottom: -10px;
`;
