import React from "react";
import styled from "styled-components";
import TitleSection from "components/TitleSection";
import danger from "assets/danger.svg";
import info from "assets/info.svg";
import Modal from "main/home/modals/Modal";

interface PorterYAMLErrorsModalProps {
  errors: string[];
  onClose: (...args: any[]) => void;
  repo: string;
  branch?: string;
}

const PorterYAMLErrorsModal = ({
  errors,
  onClose,
  repo,
  branch,
}: PorterYAMLErrorsModalProps) => {
  if (!errors.length) {
    return null;
  }

  return (
    <Modal onRequestClose={() => onClose()} height="auto">
      <TitleSection icon={danger}>
        <Text>porter.yaml</Text>
      </TitleSection>
      <InfoRow>
        <InfoTab>
          <img src={info} /> <Bold>Repo:</Bold>
          {repo}
        </InfoTab>
        {branch ? (
          <InfoTab>
            <img src={info} /> <Bold>Branch:</Bold>
            {branch}
          </InfoTab>
        ) : null}
      </InfoRow>
      <Message>
        {errors.map((el) => {
          return (
            <div>
              {"- "}
              {el}
            </div>
          );
        })}
      </Message>
    </Modal>
  );
};

const Text = styled.div`
  font-weight: 500;
  font-size: 18px;
  z-index: 999;
`;

const InfoTab = styled.div`
  display: flex;
  align-items: center;
  opacity: 50%;
  font-size: 13px;
  margin-right: 15px;
  justify-content: center;

  > img {
    width: 13px;
    margin-right: 7px;
  }
`;

const InfoRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-start;
  margin-bottom: 12px;
`;

const Bold = styled.div`
  font-weight: 500;
  margin-right: 5px;
`;

const Message = styled.div`
  padding: 20px;
  background: #26292e;
  border-radius: 5px;
  line-height: 1.5em;
  border: 1px solid #aaaabb33;
  font-size: 13px;
  margin-top: 40px;
`;

export default PorterYAMLErrorsModal;
