import InputRow from "components/form-components/InputRow";
import SaveButton from "components/SaveButton";
import React, { useContext } from "react";
import { Context } from "shared/Context";
import styled from "styled-components";

/**
 * If user goes to /onboarding and has clusters, the Onboarding component
 * will open this modal to let user skip onboarding and keep using porter.
 */
const SkipOnboardingModal = () => {
  const { currentModalData, setCurrentModal } = useContext(Context);

  return (
    <>
      <Subtitle>
        Looks like you already know how to setup your project!
      </Subtitle>
      <Subtitle>
        We've found a cluster connected to your project, although you probably
        know how to setup everything by your own, we still wanted to ask you!
      </Subtitle>
      <Subtitle>Do you wanna skip onboarding?</Subtitle>
      <ActionsWrapper>
        <ActionButton
          text="Yes, take me out"
          color="#616FEEcc"
          onClick={() =>
            typeof currentModalData?.skipOnboarding === "function" &&
            currentModalData.skipOnboarding()
          }
          status={""}
          clearPosition
        />
        <ActionButton
          text="Continue onboarding"
          color="#616FEEcc"
          onClick={() => setCurrentModal(null, null)}
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
