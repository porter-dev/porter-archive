import Button from "components/porter/Button";
import Modal from "components/porter/Modal";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import { PorterAppFormData } from "lib/porter-apps";
import React, { Dispatch, SetStateAction } from "react";
import { useFormContext } from "react-hook-form";
import styled from "styled-components";

type Props = {
  cancelRedeploy: () => void;
  setOpen: Dispatch<SetStateAction<boolean>>;
  finalizeDeploy: () => void;
};

const ConfirmRedeployModal: React.FC<Props> = ({
  cancelRedeploy,
  setOpen,
  finalizeDeploy,
}) => {
  const { setValue } = useFormContext<PorterAppFormData>();

  return (
    <Modal closeModal={() => setOpen(false)}>
      <Text size={16}>Confirm deploy</Text>
      <Spacer y={0.5} />
      <Text color="helper">
        A change to your application's build settings has been detected.
        Confirming this change will trigger a rerun of your application's CI
        pipeline.
      </Text>
      <Spacer y={0.5} />

      <ButtonContainer>
        <Button
          onClick={() => {
            cancelRedeploy();
            setOpen(false);
          }}
          color="#b91133"
        >
          Cancel
        </Button>
        <Button
          onClick={() => {
            setValue("redeployOnSave", true);
            finalizeDeploy();
          }}
        >
          Continue
        </Button>
      </ButtonContainer>
    </Modal>
  );
};

export default ConfirmRedeployModal;

const ButtonContainer = styled.div`
  display: flex;
  justify-content: flex-end;
  column-gap: 0.5rem;
`;
