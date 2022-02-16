import Modal from "main/home/modals/Modal";
import React from "react";
import styled from "styled-components";

const ConnectToJobInstructionsModal: React.FC<{
  show: boolean;
  onClose: () => void;
  job: any;
}> = ({ show, job, onClose }) => {
  if (!show) {
    return null;
  }

  return (
    <Modal
      onRequestClose={() => onClose()}
      width="700px"
      height="300px"
      title="How to connect to a job"
    >
      To connect to this pod you will have to use the Porter CLI, if you don't
      have it please follow{" "}
      <a href={"https://docs.porter.run/cli/installation"} target="_blank">
        this instructions
      </a>
      <br />
      <br />
      After you have the Porter CLI installed and running. You can run the next
      line of code. Please remember to change the command to something that your
      container can run.
      <Code>
        porter run {job?.metadata?.labels["meta.helm.sh/release-name"]} --
        [COMMAND]
      </Code>
    </Modal>
  );
};

export default ConnectToJobInstructionsModal;

const Code = styled.div`
  background: #181b21;
  padding: 10px 15px;
  border: 1px solid #ffffff44;
  border-radius: 5px;
  margin: 10px 0px 15px;
  color: #ffffff;
  font-size: 13px;
  user-select: text;
  line-height: 1em;
  font-family: monospace;
`;
