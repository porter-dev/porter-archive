import React from "react";
import styled from "styled-components";
import { ProjectType } from "shared/types";
import { useHistory } from "react-router-dom";
import Button from "components/porter/Button";
import Text from "components/porter/Text";
import Spacer from "components/porter/Spacer";

interface PreviewEnvDeletedProps {
  repository?: string;
  currentProject?: ProjectType;
}

const PreviewEnvDeleted: React.FC<PreviewEnvDeletedProps> = ({}) => {
  const history = useHistory();

  const handleBackButtonClick = () => {
    history.push("/preview-environments/deployments/");
  };

  return (
    <DeletedContainer>
      <Text size={16}>This preview environment has been deleted.</Text>
      <Spacer y={0.5} />
      <Button width="75px" onClick={handleBackButtonClick}>
        <i className="material-icons">keyboard_backspace</i>
        Back
      </Button>
    </DeletedContainer>
  );
};

const DeletedContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  width: 100%;
`;

const ClusterPlaceholder = styled.div`
  padding: 25px;
  border-radius: 5px;
  background: ${(props) => props.theme.fg};
  border: 1px solid #494b4f;
  padding-bottom: 35px;
`;
const BackButton = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 22px;
  cursor: pointer;
  font-size: 13px;
  height: 35px;
  padding: 5px 13px;
  margin-bottom: -7px;
  padding-right: 15px;
  border: 1px solid #ffffff55;
  border-radius: 100px;
  width: ${(props: { width: string }) => props.width};
  color: white;
  background: #ffffff11;

  :hover {
    background: #ffffff22;
  }

  > i {
    color: white;
    font-size: 16px;
    margin-right: 6px;
  }
`;
export default PreviewEnvDeleted;
