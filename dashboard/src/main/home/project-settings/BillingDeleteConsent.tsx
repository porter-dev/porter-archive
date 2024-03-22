import React, { useContext, useState } from "react";

import Button from "components/porter/Button";
import Modal from "components/porter/Modal";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";

import { Context } from "shared/Context";

type Props = {
  setShowModal: (show: boolean) => void;
  show: boolean;
  onDelete: () => void;
};

const BillingDeleteConsent: React.FC<Props> = ({
  setShowModal,
  show,
  onDelete,
}) => {
  const [confirmDelete, setDeleteCost] = useState("");
  const { currentProject } = useContext(Context);
  return show ? (
    <>
      <Modal
        closeModal={() => {
          setDeleteCost("");
          setShowModal(false);
        }}
      >
        <Text size={16}>Delete payment method?</Text>
        <Spacer y={1} />
        <Button
          disabled={confirmDelete}
          onClick={() => {
            setShowModal(false);
            onDelete();
          }}
          status={
            confirmDelete == currentProject?.name
              ? "This action cannot be undone"
              : ""
          }
        >
          Confirm
        </Button>
      </Modal>
    </>
  ) : null;
};

export default BillingDeleteConsent;
