import React from "react";
import styled from "styled-components";
import DynamicLink from "components/DynamicLink";
import { ProjectType } from "shared/types";
import { useHistory } from "react-router-dom";
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
      <ClusterPlaceholder>
        <DeletedMessage>
          This preview environment has been deleted.
        </DeletedMessage>

        <BackButton width="75px" onClick={handleBackButtonClick}>
          <i className="material-icons">keyboard_backspace</i>
          Back
        </BackButton>
      </ClusterPlaceholder>
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

const DeletedMessage = styled.h3`
  margin-bottom: 20px;
`;

const GoBackLink = styled(DynamicLink)`
  color: #327bff;
  text-decoration: underline;
  cursor: pointer;

  &:hover {
    color: #2666d9;
  }
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
