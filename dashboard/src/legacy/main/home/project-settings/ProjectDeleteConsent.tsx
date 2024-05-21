import React, { useContext, useState } from "react";
import Button from "legacy/components/porter/Button";
import ExpandableSection from "legacy/components/porter/ExpandableSection";
import Fieldset from "legacy/components/porter/Fieldset";
import Input from "legacy/components/porter/Input";
import Link from "legacy/components/porter/Link";
import Modal from "legacy/components/porter/Modal";
import Spacer from "legacy/components/porter/Spacer";
import Text from "legacy/components/porter/Text";
import api from "legacy/shared/api";
import styled from "styled-components";

import { Context } from "shared/Context";

type Props = {
  setShowCostConfirmModal: (show: boolean) => void;
  show: boolean;
};

const ProjectDeleteConsent: React.FC<Props> = ({
  setShowCostConfirmModal,
  show,
}) => {
  const [confirmDelete, setDeleteCost] = useState("");
  const { currentProject, setCurrentModal } = useContext(Context);
  return show ? (
    <>
      <Modal
        closeModal={() => {
          setDeleteCost("");
          setShowCostConfirmModal(false);
        }}
      >
        <Text size={16}>Delete {currentProject.name}?</Text>
        <Spacer y={1} />

        <Text size={14} color="red">
          Attention:
        </Text>
        <Spacer y={0.1} />
        <Text>
          Destruction of resources sometimes results in dangling resources. To
          ensure that everything has been properly destroyed, please visit your
          cloud provider's console.
        </Text>
        <Link
          target="_blank"
          hasunderline
          to="https://docs.porter.run/other/deleting-dangling-resources"
        >
          Deletion instructions
        </Link>
        <Spacer y={1} />

        <Text color="helper">
          To acknowledge, enter the project name in the text input field.
        </Text>
        <Input
          placeholder={currentProject.name}
          value={confirmDelete}
          setValue={setDeleteCost}
          width="100%"
          height="40px"
        />
        <Spacer y={1} />

        <Button
          disabled={confirmDelete !== currentProject?.name}
          onClick={() => {
            setShowCostConfirmModal(false);
            setCurrentModal("UpdateProjectModal", {
              currentProject: currentProject,
            });
          }}
          status={
            confirmDelete == currentProject?.name
              ? "This action cannot be undone"
              : ""
          }
        >
          Continue
        </Button>
      </Modal>
    </>
  ) : null;
};

export default ProjectDeleteConsent;

const Cost = styled.div`
  font-weight: 600;
  font-size: 20px;
`;

const Tab = styled.span`
  margin-left: 20px;
  height: 1px;
`;
