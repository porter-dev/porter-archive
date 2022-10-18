import Modal from "main/home/modals/Modal";
import React from "react";
import styled from "styled-components";

type Props = {
  hide: boolean;
  isReEnable: boolean;
  onClose: () => void;
};

const RecreateWorkflowFilesModal = (props: Props) => {
  const createNewWorkflows = () => {};

  if (props.hide) {
    return null;
  }

  return (
    <Modal title="Workflow files not found">
      <div>
        <div>
          We couldn't find any workflow files to process the{" "}
          {props.isReEnable
            ? "re enabling of this preview environment"
            : "creation of this preview environment"}
          .
          <HighlightText>
            Do you want to create the workflow files? Or Remove the repository?
          </HighlightText>
          <Warning highlight>
            ⚠️ If the workflow files don't exist, Porter will not be able to
            create any preview environment for this repository.
          </Warning>
        </div>

        <ActionWrapper>
          <DeleteButton onClick={() => props.onClose()}>Close</DeleteButton>
          <CancelButton onClick={() => createNewWorkflows()}>
            Create new workflows
          </CancelButton>
        </ActionWrapper>
      </div>
    </Modal>
  );
};

export default RecreateWorkflowFilesModal;

const Button = styled.button`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  cursor: pointer;
  font-family: "Work Sans", sans-serif;
  border-radius: 10px;
  color: white;
  height: 35px;
  padding: 10px 16px;
  font-weight: 500;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  cursor: pointer;
  border: none;
  :not(:last-child) {
    margin-right: 10px;
  }
`;

const DeleteButton = styled(Button)`
  ${({ disabled }: { disabled?: boolean }) => {
    if (disabled) {
      return `
      background: #aaaabbee;
      :hover {
        background: #aaaabbee;
      }    
      `;
    }

    return `
      background: #dd4b4b;
      :hover {
        background: #b13d3d;
      }`;
  }}
`;

const CancelButton = styled(Button)`
  background: #616feecc;
  :hover {
    background: #505edddd;
  }
`;

const ActionWrapper = styled.div`
  display: flex;
  align-items: center;
`;

const Warning = styled.div`
  font-size: 13px;
  display: flex;
  width: 100%;
  margin-top: 10px;
  line-height: 1.4em;
  align-items: center;
  color: white;
  > i {
    margin-right: 10px;
    font-size: 18px;
  }
  color: ${(props: { highlight: boolean }) =>
    props.highlight ? "#f5cb42" : ""};
`;

const HighlightText = styled.div`
  font-size: 16px;
  font-weight: bold;
  color: #ffffff;
`;
