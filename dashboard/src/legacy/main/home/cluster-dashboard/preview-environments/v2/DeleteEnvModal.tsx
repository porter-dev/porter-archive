import React from "react";
import Button from "legacy/components/porter/Button";
import Modal from "legacy/components/porter/Modal";
import Spacer from "legacy/components/porter/Spacer";
import Text from "legacy/components/porter/Text";

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
        onClick={() => {
          void deleteEnv();
        }}
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
