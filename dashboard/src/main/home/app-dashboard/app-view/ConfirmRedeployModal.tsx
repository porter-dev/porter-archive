import React, { useMemo, type Dispatch, type SetStateAction } from "react";
import { useFormContext } from "react-hook-form";
import styled from "styled-components";

import Button from "components/porter/Button";
import Modal from "components/porter/Modal";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import { type PorterAppFormData } from "lib/porter-apps";

import { useLatestRevision } from "./LatestRevisionContext";

type Props = {
  cancelRedeploy: () => void;
  setOpen: Dispatch<SetStateAction<boolean>>;
  finalizeDeploy: () => void;
  buildIsDirty: boolean;
};

const ConfirmRedeployModal: React.FC<Props> = ({
  cancelRedeploy,
  setOpen,
  finalizeDeploy,
  buildIsDirty,
}) => {
  const { setValue } = useFormContext<PorterAppFormData>();
  const { latestRevision } = useLatestRevision();
  const message = useMemo(() => {
    if (buildIsDirty) {
      return "A change to your application's build settings has been detected. Confirming this change will trigger a rerun of your application's CI pipeline.";
    }
    if (latestRevision.status === "BUILD_FAILED") {
      return "Your application's build previously failed. Confirming this change will trigger a rerun of your application's CI pipeline.";
    }
    if (latestRevision.status === "PREDEPLOY_FAILED") {
      return "Your application's predeploy previously failed. Confirming this change will trigger a rerun of your application's CI pipeline.";
    }
  }, [latestRevision, buildIsDirty]);

  return (
    <Modal
      closeModal={() => {
        setOpen(false);
      }}
    >
      <Text size={16}>Confirm deploy</Text>
      <Spacer y={0.5} />
      <Text color="helper">{message}</Text>
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
