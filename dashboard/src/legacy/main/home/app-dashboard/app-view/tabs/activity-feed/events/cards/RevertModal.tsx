import React from "react";
import Button from "legacy/components/porter/Button";
import Modal from "legacy/components/porter/Modal";
import Spacer from "legacy/components/porter/Spacer";
import Text from "legacy/components/porter/Text";
import styled from "styled-components";

type RevertModalProps = {
  revert: (id: string) => Promise<void>;
  closeModal: () => void;
  revision: { revisionNumber: number; id: string };
  loading: boolean;
};

export const RevertModal: React.FC<RevertModalProps> = ({
  closeModal,
  revision,
  revert,
  loading,
}) => {
  return (
    <Modal closeModal={closeModal}>
      <Text size={16}>Revert to version {revision.revisionNumber}</Text>
      <Spacer y={0.5} />
      <Text color="helper">
        Click continue to confirm that you want to revert to version{" "}
        {revision.revisionNumber}.
      </Text>
      <Spacer y={0.5} />
      <ButtonContainer>
        <Button
          onClick={() => {
            closeModal();
          }}
          color="#b91133"
        >
          Cancel
        </Button>
        <Button
          onClick={() => {
            void revert(revision.id);
          }}
          status={loading ? "loading" : ""}
          loadingText="Reverting..."
          disabled={loading}
        >
          Continue
        </Button>
      </ButtonContainer>
    </Modal>
  );
};

const ButtonContainer = styled.div`
  display: flex;
  justify-content: flex-end;
  column-gap: 0.5rem;
`;
