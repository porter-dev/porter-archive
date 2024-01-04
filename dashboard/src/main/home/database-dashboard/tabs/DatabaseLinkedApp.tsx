import React from "react";
import styled, { keyframes } from "styled-components";

import DynamicLink from "components/DynamicLink";

type DatabaseLinkedAppProps = {
  appName: String;
};

const DatabaseLinkedApp: React.FC<DatabaseLinkedAppProps> = ({ appName }) => {
  return (
    <StyledCard>
      <Flex>
        <ContentContainer>
          <EventInformation>
            <EventName>{appName}</EventName>
          </EventInformation>
        </ContentContainer>
        <ActionContainer>
          <ActionButton
            to={`/apps/${appName}`}
            target="_blank"
            >
            <span className="material-icons-outlined">open_in_new</span>
          </ActionButton>
        </ActionContainer>
      </Flex>
    </StyledCard>
  );
};

export default DatabaseLinkedApp;

const fadeIn = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`;

const StyledCard = styled.div`
  border-radius: 8px;
  padding: 10px 18px;
  overflow: hidden;
  font-size: 13px;
  animation: ${fadeIn} 0.5s;

  background: #2b2e3699;
  margin-bottom: 15px;
  overflow: hidden;
  border: 1px solid #ffffff0a;
`;

const Flex = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const ContentContainer = styled.div`
  display: flex;
  height: 100%;
  width: 100%;
  align-items: center;
`;

const EventInformation = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  height: 100%;
`;

const EventName = styled.div`
  font-family: "Work Sans", sans-serif;
  font-weight: 500;
  color: #ffffff;
`;

const ActionContainer = styled.div`
  display: flex;
  align-items: center;
  white-space: nowrap;
  height: 100%;
`;

const ActionButton = styled(DynamicLink)`
  position: relative;
  border: none;
  background: none;
  color: white;
  padding: 5px;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 50%;
  cursor: pointer;
  color: #aaaabb;
  border: 1px solid #ffffff00;

  :hover {
    background: #ffffff11;
    border: 1px solid #ffffff44;
  }

  > span {
    font-size: 20px;
  }
`;
