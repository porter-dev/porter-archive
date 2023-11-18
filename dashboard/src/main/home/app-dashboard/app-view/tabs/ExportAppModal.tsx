import Button from "components/porter/Button";
import Checkbox from "components/porter/Checkbox";
import Modal from "components/porter/Modal";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";

import React, { useState } from "react";
import styled from "styled-components";
import YamlEditor from "../../../../../components/YamlEditor";

type Props = {
  closeModal: () => void;
  yaml: string;
};

const ExportAppModal: React.FC<Props> = ({
  closeModal,
  yaml,
}) => {
  return (
    <Modal closeModal={closeModal}>
        <StyledValuesYaml>
            <Wrapper>
                <YamlEditor
                    value={yaml}
                    height="calc(100vh - 412px)"
                    readOnly={true}
                />
            </Wrapper>
            <Spacer y={0.5} />
        </StyledValuesYaml>
    </Modal>
  );
};

export default ExportAppModal;

const Wrapper = styled.div`
  overflow: auto;
  border-radius: 8px;
  margin-bottom: 30px;
  border: 1px solid #ffffff33;
`;

const StyledValuesYaml = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: calc(100vh - 350px);
  font-size: 13px;
  overflow: hidden;
  border-radius: 8px;
  animation: floatIn 0.3s;
  animation-timing-function: ease-out;
  animation-fill-mode: forwards;
  @keyframes floatIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0px);
    }
  }
`;
