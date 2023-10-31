import Button from "components/porter/Button";
import Modal from "components/porter/Modal";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";

import React from "react";
import styled from "styled-components";

type Props = {
  closeModal: () => void;
  deleteEnv: () => Promise<void>;
  loading?: boolean;
};

const DeleteEnvModal: React.FC<Props> = ({
  closeModal,
  deleteEnv,
  loading = false,
}) => {
  return (
    <Modal closeModal={closeModal}>
      <Text size={16}>Confirm deletion</Text>
      <Spacer y={0.5} />
      <Text color="helper">
        Click the button below to confirm environment deletion. This action is
        irreversible.
      </Text>
      <Spacer y={0.5} />
      <Text color="helper">
        Deleting this environment will tear down all apps and any associated
        resources.
      </Text>
      <Spacer y={1} />
      <Button
        onClick={() => deleteEnv()}
        color="#b91133"
        status={loading ? "loading" : ""}
        loadingText="Deleting..."
        disabled={loading}
      >
        Delete
      </Button>
    </Modal>
  );
};

export default DeleteEnvModal;

const Code = styled.span`
  font-family: monospace;
`;
