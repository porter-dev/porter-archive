import React, { useState, useContext } from "react";
import styled from "styled-components";

import { Context } from "shared/Context";
import api from "shared/api";

import Modal from "components/porter/Modal";
import Text from "components/porter/Text";
import Spacer from "components/porter/Spacer";
import Fieldset from "components/porter/Fieldset";
import Button from "components/porter/Button";
import ExpandableSection from "components/porter/ExpandableSection";
import Input from "components/porter/Input";
import Link from "components/porter/Link";

type Props = {
  setShowCostConfirmModal: (show: boolean) => void;
  show: boolean
};

const ProjectDeleteConsent: React.FC<Props> = ({
  setShowCostConfirmModal,
  show,
}) => {
  const [confirmDelete, setDeleteCost] = useState("");
  const {
    currentProject, setCurrentModal
  } = useContext(Context);
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
        <Spacer y={.1} />
        <Text>
          Destruction of resources sometimes results in dangling resources. To
          ensure that everything has been properly destroyed, please visit
          your cloud provider's console.
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
          status={confirmDelete == currentProject?.name ? "This action cannot be undone" : ""}
        >
          Continue
        </Button>
      </Modal>
    </>) : null
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
