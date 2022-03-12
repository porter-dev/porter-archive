import Modal from "main/home/modals/Modal";
import React from "react";
import styled from "styled-components";

const ConnectToLogsInstructionModal: React.FC<{
  show: boolean;
  onClose: () => void;
  chartName: string;
  namespace: string;
}> = ({ show, chartName, namespace, onClose }) => {
  if (!show) {
    return null;
  }

  return (
    <Modal
      onRequestClose={() => onClose()}
      width="700px"
      height="300px"
      title="Shell Access Instructions"
    >
      To get shell live logs for this pod, make sure you have the Porter CLI
      installed (installation instructions&nbsp;
      <a href={"https://docs.porter.run/cli/installation"} target="_blank">
        here
      </a>
      ).
      <br />
      <br />
      Run the following line of code:
      <Code>
        porter logs {chartName || "[APP-NAME]"} --follow --namespace{" "}
        {namespace || "[NAMESPACE]"}
      </Code>
    </Modal>
  );
};

export default ConnectToLogsInstructionModal;

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
